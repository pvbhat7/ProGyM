<?php
    // Returns today's (IST) remaining unsettled WC matches relative to "now".
    // Used by the admin WC Leaderboard page "Match reminder" mode so the message
    // can list every fixture still to come today. Empty array if none remain.

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

    $item = new WcMatch($db);
    $stmt = $item->getTodayUpcomingMatches();

    $matches = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $matches[] = array(
            "id"          => (int)$row['id'],
            "team_a_name" => $row['team_a_name'],
            "team_a_code" => $row['team_a_code'],
            "team_b_name" => $row['team_b_name'],
            "team_b_code" => $row['team_b_code'],
            "stage"       => $row['stage'],
            "kickoff_at"  => $row['kickoff_at']
        );
    }

    echo json_encode(array("ok" => true, "matches" => $matches));
?>
