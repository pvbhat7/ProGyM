<?php
    // Daily leaderboard — coins earned from matches SETTLED on the given date.
    // Tiebreaker = matches predicted that day. Useful for daily winner highlights.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcParticipant.php';

    // Default date = today in IST.
    $tz = new DateTimeZone('Asia/Calcutta');
    $today = (new DateTime('now', $tz))->format('Y-m-d');
    $date  = isset($_GET['date']) ? trim($_GET['date']) : $today;
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $date = $today;

    $limit = isset($_GET['limit']) ? max(1, min(10000, (int)$_GET['limit'])) : 10000;

    $database = new Database();
    $db = $database->getConnection();

    // Gym-admin (Pranav Patil, mobile 8796655176) is hidden from the leaderboard
    // — mirrors overall.php exclusion so ranks are consistent across tabs.
    $excludedIds = array();
    $st = $db->prepare("SELECT id FROM client WHERE mobile = ? LIMIT 1");
    $st->execute(['8796655176']);
    if ($eid = $st->fetchColumn()) $excludedIds[(string)$eid] = true;

    $item = new WcParticipant($db);
    $stmt = $item->getDailyLeaderboard($date, $limit);

    $rows = array();
    $rank = 0;
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        if (isset($excludedIds[(string)$r['client_id']])) continue;
        $rank++;
        $rows[] = array(
            "rank"                     => $rank,
            "client_id"                => $r['client_id'],
            "client_name"              => $r['client_name'],
            "client_photo"             => $r['client_photo'],
            "coins_today"              => (float)$r['coins_today'],
            "matches_predicted_today"  => (int)$r['matches_predicted_today']
        );
    }

    echo json_encode(array(
        "date"        => $date,
        "limit"       => $limit,
        "count"       => count($rows),
        "leaderboard" => $rows
    ));
?>
