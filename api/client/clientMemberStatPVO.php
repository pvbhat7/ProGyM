<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/client.php';
	include_once '../../config/database.php';
    include_once '../../class/packageDetails.php';
    include_once '../../class/paymenttransaction.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new client($db);
    
   
       $item->profileActiveFlag = isset($_GET['profileActiveFlag']) ? $_GET['profileActiveFlag'] : die();

    $stmt = $item->getActiveClientMemberStatPVO();
    
	$itemCount = $stmt->rowCount();

	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
           $objArray[$cnt] = array(
			"id" =>  $row['id'],
            "name" =>  $row['name'],
			"mobile" =>  $row['mobile'],
			"email" =>  $row['email'],
			"gender" =>  $row['gender'],
			"referPoints" =>  $row['referPoints'],
			"profileActiveFlag" =>  $row['profileActiveFlag'],
			"packagePaymentStatus" =>  $row['status'],
			"startDate" =>  $row['startDate'],
			"endDate" =>  $row['endDate'],
			"packageName" =>  $row['description'],
			"feesPaid" =>  $row['amountPaid'],
			"packageTotalFees" =>  $row['fees'],
			"clientPhoto" =>  $row['clientPhoto'],
			"isGymClient" =>  $row['isGymClient'],
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