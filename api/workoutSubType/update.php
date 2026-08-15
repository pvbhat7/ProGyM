<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
    include_once '../../class/WorkoutSubType.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new WorkoutSubType($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    
    // employee values
			$item->wsoid= $data->wsoid;
			$item->twsid= $data->twsid;
			$item->maxReps= $data->maxReps;
			$item->sequence= $data->sequence;			
			$item->discontinue= $data->discontinue;
			$item->clientPerformance= $data->clientPerformance;
			$item->image= $data->image;
			$item->id= $data->id;	
    
    if($item->updateWorkoutSubType()){
        echo json_encode("WorkoutSubType data updated.");
    } else{
        echo json_encode("WorkoutSubType could not be updated");
    }
?>