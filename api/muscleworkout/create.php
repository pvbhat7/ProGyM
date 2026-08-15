<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/muscleworkout.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new muscleworkout($db);

    $data = json_decode(file_get_contents("php://input"));

    $item->day             = $data->day;
    $item->mainWorkoutName = $data->mainWorkoutName;
    $item->subWorkoutName  = $data->subWorkoutName;

    if($item->create()){
        echo json_encode(array("id" => $db->lastInsertId(), "message" => "muscleworkout created successfully."));
    } else {
        echo json_encode("muscleworkout could not be created.");
    }
?>
