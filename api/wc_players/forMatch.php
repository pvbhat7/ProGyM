<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcPlayer.php';

    $teamA = isset($_GET['team_a_id']) ? (int)$_GET['team_a_id'] : 0;
    $teamB = isset($_GET['team_b_id']) ? (int)$_GET['team_b_id'] : 0;
    if ($teamA <= 0 || $teamB <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing team_a_id or team_b_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcPlayer($db);
    $stmt = $item->getPlayersForMatch($teamA, $teamB);

    // Return as { team_a: [...], team_b: [...] } for easy use in the prediction form
    $teamAPlayers = array();
    $teamBPlayers = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
        $entry = array(
            "id"            => $row['id'],
            "team_id"       => $row['team_id'],
            "name"          => $row['name'],
            "position"      => $row['position'],
            "jersey_number" => $row['jersey_number']
        );
        if ((int)$row['team_id'] === $teamA){
            $teamAPlayers[] = $entry;
        } else {
            $teamBPlayers[] = $entry;
        }
    }

    echo json_encode(array(
        "team_a_id"      => $teamA,
        "team_b_id"      => $teamB,
        "team_a_players" => $teamAPlayers,
        "team_b_players" => $teamBPlayers
    ));
?>
