<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/t_workoutsubtype.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new t_workoutsubtype($db);

    $data = json_decode(file_get_contents("php://input"));

            $item->name= $data->name;
			$item->mtid= $data->mtid;
			$item->discontinue= $data->discontinue;
			$item->gifFilePath= $data->gifFilePath;
			$item->sets= $data->sets;
			$item->reps= $data->reps;
			$item->muscle= isset($data->muscle) ? $data->muscle : '';
			$item->externalCode= $data->id;			
			
    
    if($item->createSubWorkoutType()){
        echo 't_workoutsubtype created successfully.';
    } else{
        echo 't_workoutsubtype could not be created.';
    }
	
	
	//echo $item->createClient();
	
?>