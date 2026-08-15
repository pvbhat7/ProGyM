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

    $database = new Database();
    $db = $database->getConnection();

    $items = new dietPlanTemplate($db);

   $stmt = $items->getMaxId();
    $itemCount = $stmt->rowCount();


    //echo json_encode($itemCount);
	$clientExternalCodesArray = '';

    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			if($clientExternalCodesArray == '')
            $clientExternalCodesArray = $maxId;
			else
			$clientExternalCodesArray = $clientExternalCodesArray.",".$maxId;
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