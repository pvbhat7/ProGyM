<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcMatch.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcMatch($db);
    $stmt = $item->getUpcomingMatches();

    if ($stmt->rowCount() > 0){
        $objArray = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            $objArray[] = array(
                "id"            => $row['id'],
                "team_a_id"     => $row['team_a_id'],
                "team_b_id"     => $row['team_b_id'],
                "team_a_label"  => $row['team_a_label'],
                "team_b_label"  => $row['team_b_label'],
                "team_a_name"   => $row['team_a_name'],
                "team_a_code"   => $row['team_a_code'],
                "team_a_flag"   => $row['team_a_flag'],
                "team_a_group"  => $row['team_a_group'],
                "team_b_name"   => $row['team_b_name'],
                "team_b_code"   => $row['team_b_code'],
                "team_b_flag"   => $row['team_b_flag'],
                "team_b_group"  => $row['team_b_group'],
                "stage"         => $row['stage'],
                "multiplier"    => $row['multiplier'],
                "kickoff_at"    => $row['kickoff_at'],
                "status"        => $row['status']
            );
        }
        echo json_encode($objArray);
    } else {
        http_response_code(404);
        echo json_encode(array("message" => "No upcoming matches."));
    }
?>
