<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/orders.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Orders($db);

	$item->clientId = isset($_GET['clientId']) ? $_GET['clientId'] : die();

    $stmt = $item->getOrderByClientId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           $objArray[$cnt] = array(
              "order_id" => $row[order_id],
              "img" => $row[img],
              "name" => $row[name],
              "date" => $row[date],
              "status" => $row[status],
              "clientId" => $row[clientId],
              "amount" => $row[amount],
              "paymentStatus" => $row[paymentStatus],
              "trackingDetails" => $row[trackingDetails],
              "proCoinUsed" => $row[proCoinUsed],
              "couponUsed" => $row[couponUsed],
              "txnId" => $row[txnId]
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