<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
    include_once '../../class/t_workoutmaintype.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new t_workoutmaintype($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    
    // employee values
            $item->id= $data->id;
			$item->name= $data->name;
			$item->discontinue= $data->discontinue;

    if($item->updateMainWorkoutType()){
        echo json_encode("t_workoutmaintype data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>