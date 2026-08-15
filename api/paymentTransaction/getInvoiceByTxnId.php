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
    
    $item->id = isset($_GET['id']) ? $_GET['id'] : die();


    $stmt = $item->getInvoiceByTxnId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           
			echo json_encode(array(
            "id" =>  $row['id'],
			"clientEmail" =>  $row['clientEmail'],
			"clientName" =>  $row['clientName'],
            "duration" =>  $row['duration'],
			"packageName" =>  $row['packageName'],
			"paymentDate" =>  $row['paymentDate'],
			"paymentTransactionId" =>  $row['paymentTransactionId'],
			"fees" =>  $row['fees'],
			"amount" =>  $row['amountPaid'] ));
          
        }
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>