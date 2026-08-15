<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    
    include_once '../../config/database.php';
    include_once '../../class/WorkoutScheduleObject.php';

    $database = new Database();
    $db = $database->getConnection();

    $items = new WorkoutScheduleObject($db);

    $stmt = $items->getAllClientExternalCodes();
    $itemCount = $stmt->rowCount();


    //echo json_encode($itemCount);
	$clientExternalCodesArray = '';

    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			if($clientExternalCodesArray == '')
            $clientExternalCodesArray = $externalCode;
			else
			$clientExternalCodesArray = $clientExternalCodesArray.",".$externalCode;
        }
		echo json_encode($clientExternalCodesArray);
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>