<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $db = (new Database())->getConnection();

    $id = isset($_GET['id']) ? intval($_GET['id']) : die();

    // 1. Client profile
    $stmt = $db->prepare("
        SELECT id, name, mobile, email, gender, birthDate, address,
               bloodGroup, occupation, height, weight, photo,
               profileActiveFlag, admissionDate, isPTClient, isGymClient,
               creationSource, remarks, previousGym, adp, awp, reference
        FROM client WHERE id = ? LIMIT 1
    ");
    $stmt->execute([$id]);
    $client = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$client) {
        http_response_code(404);
        echo json_encode(["message" => "Not found"]);
        exit;
    }

    // 2. Package details with payment transactions (newest first)
    $pkgStmt = $db->prepare("
        SELECT id, description, fees, startDate, endDate,
               amountPaid, paymentDate, status, packageId, discontinue
        FROM packagedetails
        WHERE clientId = ?
        ORDER BY id DESC
    ");
    $pkgStmt->execute([$id]);
    $packages = [];
    while ($pkg = $pkgStmt->fetch(PDO::FETCH_ASSOC)) {
        $txStmt = $db->prepare("
            SELECT id, feesPaid, paymentDate, isApproved, paymentMode, proCoinsUsed
            FROM paymenttransaction
            WHERE packageDetailsId = ? AND (discontinue IS NULL OR discontinue != 'true')
            ORDER BY id DESC
        ");
        $txStmt->execute([$pkg['id']]);
        $pkg['transactions'] = $txStmt->fetchAll(PDO::FETCH_ASSOC);
        $packages[] = $pkg;
    }

    // 3. Attendance this month
    date_default_timezone_set('Asia/Calcutta');
    $month = (int) date('n');
    $year  = (int) date('Y');
    $attStmt = $db->prepare("
        SELECT day, date, timeStamp
        FROM attendance
        WHERE cid = ? AND month = ? AND year = ? AND status = 1
        ORDER BY day ASC
    ");
    $attStmt->execute([$id, $month, $year]);
    $attendance = $attStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Weight history (last 15)
    $wtStmt = $db->prepare("
        SELECT id, date, weight
        FROM WeightTracker
        WHERE cid = ?
        ORDER BY id DESC
        LIMIT 15
    ");
    $wtStmt->execute([$id]);
    $weights = $wtStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Active diet plan name
    $dietName = null;
    if (!empty($client['adp'])) {
        $s = $db->prepare("SELECT name FROM dietplantemplate WHERE id = ? LIMIT 1");
        $s->execute([$client['adp']]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        $dietName = $row ? $row['name'] : null;
    }

    // 6. Active workout type name
    $workoutName = null;
    if (!empty($client['awp'])) {
        $s = $db->prepare("SELECT name FROM t_workoutmaintype WHERE id = ? LIMIT 1");
        $s->execute([$client['awp']]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        $workoutName = $row ? $row['name'] : null;
    }

    // 7. Referred-by client (name + id) if reference stored
    $referredBy = null;
    if (!empty($client['reference']) && is_numeric($client['reference'])) {
        $s = $db->prepare("SELECT id, name FROM client WHERE id = ? LIMIT 1");
        $s->execute([intval($client['reference'])]);
        $row = $s->fetch(PDO::FETCH_ASSOC);
        if ($row) $referredBy = ["id" => $row['id'], "name" => $row['name']];
    }

    echo json_encode([
        "client"          => $client,
        "packages"        => $packages,
        "attendance"      => $attendance,
        "attendanceMonth" => $month,
        "attendanceYear"  => $year,
        "weights"         => $weights,
        "dietName"        => $dietName,
        "workoutName"     => $workoutName,
        "referredBy"      => $referredBy,
    ]);
?>
