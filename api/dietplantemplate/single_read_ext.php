<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/dietPlanTemplate.php';

    $database = new Database();
    $db = $database->getConnection();
    $item = new dietPlanTemplate($db);
	
    $item->externalCode = isset($_GET['extCode']) ? $_GET['extCode'] : die();
  
    $item->getDietplantemplateByExtCode();

    if($item->externalCode != null){
        // create array
        $emp_arr = array(
            "id" =>  $item->id,    
            "cid" =>  $item->cid,    
			"name" =>  $item->name,    
			"createDate" =>  $item->createDate,    
			"discontinue" =>  $item->discontinue,    
			"time_1" =>  $item->time_1,    
			"activity_1" =>  $item->activity_1,    
			"time_2" =>  $item->time_2,    
			"activity_2" =>  $item->activity_2,    
			"time_3" =>  $item->time_3,    
			"activity_3" =>  $item->activity_3,    
			"time_4" =>  $item->time_4,    
			"activity_4" =>  $item->activity_4,    
			"time_5" =>  $item->time_5,    
			"activity_5" =>  $item->activity_5,    
			"time_6" =>  $item->time_6,    
			"activity_6" =>  $item->activity_6,    
			"time_7" =>  $item->time_7,    
			"activity_7" =>  $item->activity_7,    
			"time_8" =>  $item->time_8,    
			"activity_8" =>  $item->activity_8,
			"time_9" =>  $item->time_9,    
			"activity_9" =>  $item->activity_9,    
			"time_10" =>  $item->time_10,    
			"activity_10" =>  $item->activity_10,    
			"time_11" =>  $item->time_11,    
			"activity_11" =>  $item->activity_11,    
			"time_12" =>  $item->time_12,    
			"activity_12" =>  $item->activity_12,    
			"time_13" =>  $item->time_13,    
			"activity_13" =>  $item->activity_13,    
			"time_14" =>  $item->time_14,    
			"activity_14" =>  $item->activity_14,    
			"time_15" =>  $item->time_15,    
			"activity_15" =>  $item->activity_15,    
			"time_16" =>  $item->time_16,    
			"activity_16" =>  $item->activity_16,    
			"time_17" =>  $item->time_17,    
			"activity_17" =>  $item->activity_17,    
			"externalCode" =>  $item->externalCode
        );
      
        http_response_code(200);
        echo json_encode($emp_arr);
    }
      
    else{
        http_response_code(404);
        echo json_encode("DietPlanTemplate not found.");
    }
?>