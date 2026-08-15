<?php
    // Returns the next upcoming, unsettled WC match relative to "now" in IST.
    // Used by the admin WC Leaderboard page when admin is in "Match reminder" mode
    // so the message can be dynamically built around the right fixture.
    // 404 if there are no more upcoming matches.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcMatch.php';

    date_default_timezone_set('Asia/Calcutta');

    $database = new Database();
    $db = $database->getConnection();

    // getUpcomingMatches() already filters by NOW() (server TZ = IST) and orders by kickoff ASC,
    // so the first row is "the next one".
    $item = new WcMatch($db);
    $stmt = $item->getUpcomingMatches();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(array("ok" => false, "message" => "No upcoming matches."));
        exit;
    }

    echo json_encode(array(
        "ok"           => true,
        "id"           => (int)$row['id'],
        "team_a_name"  => $row['team_a_name'],
        "team_a_code"  => $row['team_a_code'],
        "team_b_name"  => $row['team_b_name'],
        "team_b_code"  => $row['team_b_code'],
        "stage"        => $row['stage'],
        "kickoff_at"   => $row['kickoff_at']
    ));
?>
