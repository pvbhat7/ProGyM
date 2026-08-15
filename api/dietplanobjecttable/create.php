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

    $data = json_decode(file_get_contents("php://input"));

			$item->adminDataSyncRequired= $data->adminDataSyncRequired;    
			$item->clientDataSyncRequired= $data->clientDataSyncRequired;    
			$item->dietDate= $data->dietDate;    
			$item->discontinue= $data->discontinue;    
			$item->cid= $data->cid;    
			$item->dptid= $data->dptid;    
			$item->clientCompletionStatus_timeActivity_1= $data->clientCompletionStatus_timeActivity_1;    
			$item->clientCompletionStatus_timeActivity_2= $data->clientCompletionStatus_timeActivity_2;    
			$item->clientCompletionStatus_timeActivity_3= $data->clientCompletionStatus_timeActivity_3;    
			$item->clientCompletionStatus_timeActivity_4= $data->clientCompletionStatus_timeActivity_4;    
			$item->clientCompletionStatus_timeActivity_5= $data->clientCompletionStatus_timeActivity_5;    
			$item->clientCompletionStatus_timeActivity_6= $data->clientCompletionStatus_timeActivity_6;    
			$item->clientCompletionStatus_timeActivity_7= $data->clientCompletionStatus_timeActivity_7;    
			$item->clientCompletionStatus_timeActivity_8= $data->clientCompletionStatus_timeActivity_8;    
			$item->clientCompletionStatus_timeActivity_9= $data->clientCompletionStatus_timeActivity_9;    
			$item->clientCompletionStatus_timeActivity_10= $data->clientCompletionStatus_timeActivity_10;    
			$item->clientCompletionStatus_timeActivity_11= $data->clientCompletionStatus_timeActivity_11;    
			$item->clientCompletionStatus_timeActivity_12= $data->clientCompletionStatus_timeActivity_12;    
			$item->clientCompletionStatus_timeActivity_13= $data->clientCompletionStatus_timeActivity_13;    
			$item->clientCompletionStatus_timeActivity_14= $data->clientCompletionStatus_timeActivity_14;    
			$item->clientCompletionStatus_timeActivity_15= $data->clientCompletionStatus_timeActivity_15;    
			$item->clientCompletionStatus_timeActivity_16= $data->clientCompletionStatus_timeActivity_16;    
			$item->clientCompletionStatus_timeActivity_17= $data->clientCompletionStatus_timeActivity_17;    
			$item->externalCode= $data->id;			
			
    
    if($item->createDietplanobjecttable()){
        echo 'created successfully.';
    } else{
        echo 'could not be created.';
    }
	
	
?>