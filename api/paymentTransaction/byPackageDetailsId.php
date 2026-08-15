<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/paymenttransaction.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new paymenttransaction($db);
    
    $item->packageDetailsId = isset($_GET['packageDetailsId']) ? $_GET['packageDetailsId'] : die();

    $stmt = $item->getByPackageDetailsid();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
           $objArray[$cnt] = array(
            "id" =>  $row['id'],
			"packageDetailsId" =>  $row['packageDetailsId'],
			"feesPaid" =>  $row['feesPaid'],
            "paymentDate" =>  $row['paymentDate'],
			"isApproved" =>  $row['isApproved'],
			"clientGender" =>  $row['clientGender'],
			"clientId" =>  $row['clientId'],
			"paymentMode" =>  $row['paymentMode'],
			"discontinue" =>  $row['discontinue'],
			"proCoinsUsed" =>  $row['proCoinsUsed'] ?? '0'
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