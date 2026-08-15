<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/Dietplanobjecttable.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Dietplanobjecttable($db);

    $item->id = isset($_GET['id']) ? $_GET['id'] : die();
  
    $item->getDietplanobjecttableById();

    if($item->externalCode != null){
        // create array
        $emp_arr = array(
            "id" =>  $item->id,    
			"adminDataSyncRequired" =>  $item->adminDataSyncRequired,    
			"clientDataSyncRequired" =>  $item->clientDataSyncRequired,    
			"dietDate" =>  $item->dietDate,    
			"discontinue" =>  $item->discontinue,    
			"cid" =>  $item->cid,    
			"dptid" =>  $item->dptid,    
			"clientCompletionStatus_timeActivity_1" =>  $item->clientCompletionStatus_timeActivity_1,    
			"clientCompletionStatus_timeActivity_2" =>  $item->clientCompletionStatus_timeActivity_2,    
			"clientCompletionStatus_timeActivity_3" =>  $item->clientCompletionStatus_timeActivity_3,    
			"clientCompletionStatus_timeActivity_4" =>  $item->clientCompletionStatus_timeActivity_4,    
			"clientCompletionStatus_timeActivity_5" =>  $item->clientCompletionStatus_timeActivity_5,    
			"clientCompletionStatus_timeActivity_6" =>  $item->clientCompletionStatus_timeActivity_6,    
			"clientCompletionStatus_timeActivity_7" =>  $item->clientCompletionStatus_timeActivity_7,    
			"clientCompletionStatus_timeActivity_8" =>  $item->clientCompletionStatus_timeActivity_8,    
			"clientCompletionStatus_timeActivity_9" =>  $item->clientCompletionStatus_timeActivity_9,    
			"clientCompletionStatus_timeActivity_10" =>  $item->clientCompletionStatus_timeActivity_10,    
			"clientCompletionStatus_timeActivity_11" =>  $item->clientCompletionStatus_timeActivity_11,    
			"clientCompletionStatus_timeActivity_12" =>  $item->clientCompletionStatus_timeActivity_12,    
			"clientCompletionStatus_timeActivity_13" =>  $item->clientCompletionStatus_timeActivity_13,    
			"clientCompletionStatus_timeActivity_14" =>  $item->clientCompletionStatus_timeActivity_14,    
			"clientCompletionStatus_timeActivity_15" =>  $item->clientCompletionStatus_timeActivity_15,    
			"clientCompletionStatus_timeActivity_16" =>  $item->clientCompletionStatus_timeActivity_16,    
			"clientCompletionStatus_timeActivity_17" =>  $item->clientCompletionStatus_timeActivity_17,    
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