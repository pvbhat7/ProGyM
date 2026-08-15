<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
    include_once '../../class/WorkoutScheduleObject.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new WorkoutScheduleObject($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    
    // employee values
			$item->cid= $data->cid;
			$item->mtid= $data->mtid;
			$item->date= $data->date;
			$item->discontinue= $data->discontinue;
			$item->id= $data->id;	
    
    if($item->updateWorkoutScheduleObject()){
        echo json_encode("WorkoutScheduleObject data updated.");
    } else{
        echo json_encode("WorkoutScheduleObject could not be updated");
    }
?>