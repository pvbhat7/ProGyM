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

    $item->id = isset($_GET['id']) ? $_GET['id'] : die();
  
    $item->getSubWorkoutTypeById();

    if($item->discontinue != null){
        // create array
        $emp_arr = array(
            "id" =>  $item->id,
			"name" =>  $item->name,
			"mtid" =>  $item->mtid,
            "discontinue" =>  $item->discontinue,
            "gifFilePath" =>  $item->gifFilePath,
            "sets" =>  $item->sets,
            "reps" =>  $item->reps,
			"externalCode" =>  $item->externalCode
        );
      
        http_response_code(200);
        echo json_encode($emp_arr);
    }
      
    else{
        http_response_code(404);
        echo json_encode("t_workoutsubtype not found.");
    }
?>