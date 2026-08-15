<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcPlayer.php';

    $teamId = isset($_GET['team_id']) ? (int)$_GET['team_id'] : 0;
    if ($teamId <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing or invalid team_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcPlayer($db);
    $stmt = $item->getPlayersByTeamId($teamId);

    if ($stmt->rowCount() > 0){
        $objArray = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            $objArray[] = array(
                "id"            => $row['id'],
                "team_id"       => $row['team_id'],
                "name"          => $row['name'],
                "position"      => $row['position'],
                "jersey_number" => $row['jersey_number'],
                "discontinue"   => $row['discontinue']
            );
        }
        echo json_encode($objArray);
    } else {
        http_response_code(404);
        echo json_encode(array("message" => "No players found for team_id=" . $teamId));
    }
?>
