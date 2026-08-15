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

    $item->dptid = isset($_GET['dptid']) ? $_GET['dptid'] : die();
    $item->dietDate = isset($_GET['dietDate']) ? $_GET['dietDate'] : die();
    $item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();
	
  
    $stmt = $item->getAllByDietPlanTemplateId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
           $objArray[$cnt] = array(
             "id" =>  $row['id'],    
			"adminDataSyncRequired" =>  $row['adminDataSyncRequired'],    
			"clientDataSyncRequired" =>  $row['clientDataSyncRequired'],    
			"dietDate" =>  $row['dietDate'],    
			"discontinue" =>  $row['discontinue'],    
			"cid" =>  $row['cid'],    
			"dptid" =>  $row['dptid'],    
			"clientCompletionStatus_timeActivity_1" =>  $row['clientCompletionStatus_timeActivity_1'],    
			"clientCompletionStatus_timeActivity_2" =>  $row['clientCompletionStatus_timeActivity_2'],    
			"clientCompletionStatus_timeActivity_3" =>  $row['clientCompletionStatus_timeActivity_3'],    
			"clientCompletionStatus_timeActivity_4" =>  $row['clientCompletionStatus_timeActivity_4'],    
			"clientCompletionStatus_timeActivity_5" =>  $row['clientCompletionStatus_timeActivity_5'],    
			"clientCompletionStatus_timeActivity_6" =>  $row['clientCompletionStatus_timeActivity_6'],    
			"clientCompletionStatus_timeActivity_7" =>  $row['clientCompletionStatus_timeActivity_7'],    
			"clientCompletionStatus_timeActivity_8" =>  $row['clientCompletionStatus_timeActivity_8'],    
			"clientCompletionStatus_timeActivity_9" =>  $row['clientCompletionStatus_timeActivity_9'],    
			"clientCompletionStatus_timeActivity_10" =>  $row['clientCompletionStatus_timeActivity_10'],    
			"clientCompletionStatus_timeActivity_11" =>  $row['clientCompletionStatus_timeActivity_11'],    
			"clientCompletionStatus_timeActivity_12" =>  $row['clientCompletionStatus_timeActivity_12'],    
			"clientCompletionStatus_timeActivity_13" =>  $row['clientCompletionStatus_timeActivity_13'],    
			"clientCompletionStatus_timeActivity_14" =>  $row['clientCompletionStatus_timeActivity_14'],    
			"clientCompletionStatus_timeActivity_15" =>  $row['clientCompletionStatus_timeActivity_15'],    
			"clientCompletionStatus_timeActivity_16" =>  $row['clientCompletionStatus_timeActivity_16'],    
			"clientCompletionStatus_timeActivity_17" =>  $row['clientCompletionStatus_timeActivity_17'],    
			"externalCode" =>  $row['externalCode']
            );
            
            $cnt = $cnt + 1;
        }
		echo json_encode($objArray);
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }

?>