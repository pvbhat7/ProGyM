<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    function parseDMY($dmy) {
        $p = explode('/', $dmy);
        return mktime(0,0,0,(int)$p[1],(int)$p[0],(int)$p[2]);
    }

    $curMonth = (int)date('m');
    $curYear  = (int)date('Y');

    // ── 1. Last 10 days trend ─────────────────────────────────────────
    $dateConds = [];
    $dateVals  = [];
    for ($i = 0; $i < 10; $i++) {
        $dateConds[] = date("d/m/Y", strtotime("-$i days"));
    }
    $placeholders = implode(',', array_fill(0, 10, '?'));
    $stmt = $db->prepare("SELECT date, COUNT(*) as cnt FROM attendance WHERE date IN ($placeholders) GROUP BY date");
    $stmt->execute($dateConds);
    $rawDays = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $dayMap = [];
    foreach ($rawDays as $r) $dayMap[$r['date']] = (int)$r['cnt'];
    $last10Days = [];
    for ($i = 9; $i >= 0; $i--) {
        $d   = date("d/m/Y", strtotime("-$i days"));
        $ts  = parseDMY($d);
        $last10Days[] = ['date' => date('d M', $ts), 'day' => date('D', $ts), 'count' => $dayMap[$d] ?? 0];
    }

    // ── 2. This month summary ─────────────────────────────────────────
    $stmt = $db->prepare("SELECT COUNT(*) as total, COUNT(DISTINCT cid) as unique_members FROM attendance WHERE month = ? AND year = ?");
    $stmt->execute([$curMonth, $curYear]);
    $monthRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $daysElapsed = (int)date('j');
    $monthSummary = [
        'total'          => (int)$monthRow['total'],
        'uniqueMembers'  => (int)$monthRow['unique_members'],
        'avgPerDay'      => $daysElapsed > 0 ? round($monthRow['total'] / $daysElapsed, 1) : 0,
        'daysElapsed'    => $daysElapsed,
    ];

    // ── 3. Today count ───────────────────────────────────────────────
    $today = date("d/m/Y");
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM attendance WHERE date = ?");
    $stmt->execute([$today]);
    $todayCount = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

    // ── 4. Gender split this month ────────────────────────────────────
    $stmt = $db->prepare(
        "SELECT c.gender, COUNT(*) as cnt FROM attendance a
         JOIN client c ON c.id = a.cid
         WHERE a.month = ? AND a.year = ?
         GROUP BY c.gender"
    );
    $stmt->execute([$curMonth, $curYear]);
    $genderRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $genderSplit = ['Male' => 0, 'Female' => 0, 'Other' => 0];
    foreach ($genderRows as $g) {
        $key = ucfirst(strtolower(trim($g['gender'])));
        if ($key === 'Male' || $key === 'Female') $genderSplit[$key] += (int)$g['cnt'];
        else $genderSplit['Other'] += (int)$g['cnt'];
    }

    // ── 5. Day-of-week distribution (last 30 days) ────────────────────
    $stmt = $db->prepare(
        "SELECT DAYNAME(STR_TO_DATE(date,'%d/%m/%Y')) as dow, COUNT(*) as cnt
         FROM attendance
         WHERE STR_TO_DATE(date,'%d/%m/%Y') >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY dow"
    );
    $stmt->execute();
    $dowRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $dowMap = [];
    foreach ($dowRaw as $r) $dowMap[$r['dow']] = (int)$r['cnt'];
    $dowOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    $dayOfWeek = [];
    foreach ($dowOrder as $d) {
        $dayOfWeek[] = ['day' => substr($d, 0, 3), 'count' => $dowMap[$d] ?? 0];
    }

    // ── 6. Top regular members this month ────────────────────────────
    $stmt = $db->prepare(
        "SELECT c.name, c.gender, COUNT(*) as visits FROM attendance a
         JOIN client c ON c.id = a.cid
         WHERE a.month = ? AND a.year = ?
         GROUP BY a.cid ORDER BY visits DESC LIMIT 10"
    );
    $stmt->execute([$curMonth, $curYear]);
    $topMembers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($topMembers as &$m) $m['visits'] = (int)$m['visits'];

    // ── 7. Monthly trend (last 12 months) ────────────────────────────
    $monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $monthlyTrend = [];
    for ($i = 11; $i >= 0; $i--) {
        $ts  = strtotime("-$i month");
        $m   = (int)date('m', $ts);
        $y   = (int)date('Y', $ts);
        $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM attendance WHERE month = ? AND year = ?");
        $stmt->execute([$m, $y]);
        $cnt = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
        $monthlyTrend[] = ['label' => $monthNames[$m] . ' ' . $y, 'short' => $monthNames[$m], 'count' => $cnt];
    }

    // ── 8. This year total ────────────────────────────────────────────
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM attendance WHERE year = ?");
    $stmt->execute([$curYear]);
    $yearTotal = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

    echo json_encode([
        'last10Days'    => $last10Days,
        'monthSummary'  => $monthSummary,
        'todayCount'    => $todayCount,
        'yearTotal'     => $yearTotal,
        'genderSplit'   => $genderSplit,
        'dayOfWeek'     => $dayOfWeek,
        'topMembers'    => $topMembers,
        'monthlyTrend'  => $monthlyTrend,
    ]);
?>
