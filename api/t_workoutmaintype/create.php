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

            $item->name= $data->name;
			$item->discontinue= $data->discontinue;

    
    if($item->createMainWorkoutType()){
        echo json_encode(array("id" => $db->lastInsertId(), "message" => "t_workoutmaintype created successfully."));
    } else{
        echo json_encode("t_workoutmaintype could not be created.");
    }
	
	
	//echo $item->createClient();
	
?>