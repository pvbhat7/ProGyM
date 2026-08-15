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

	$item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();
    $item->date = isset($_GET['date']) ? $_GET['date'] : die();
    $item->discontinue = isset($_GET['day']) ? $_GET['day'] : '';
	
    echo  $item->getWorkoutPlanObjectClientIdAndDate();
	
	

    if($item->cid != null){
        // create array
        $emp_arr = array(
            "id" =>  $item->id,    
            "cid" =>  $item->cid,    
            "mtid" =>  $item->mtid,    
			"date" =>  $item->date,    
			"discontinue" =>  $item->discontinue,
			"externalCode" =>  $item->externalCode
        );
      
        http_response_code(200);
        echo json_encode($emp_arr);
    }
      
    else{
        http_response_code(404);
        echo json_encode("Employee not found.");
    }
?>