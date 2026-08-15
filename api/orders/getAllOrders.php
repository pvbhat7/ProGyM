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

    $item = new orders($db);
	$item->filter = isset($_GET['filter']) ? $_GET['filter'] : die();

    $stmt = $item->getAllOrders();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           $objArray[$cnt] = array(
              "order_id" => $row[order_id],
              "clientServerId" => $row[clientServerId],
              "clientDesktopId" => $row[clientDesktopId],
              "productImg" => $row[productImg],
              "clientImg" => $row[clientImg],
              "productName" => $row[productName],
              "amount" => $row[amount],
              "orderStatus" => $row[orderStatus],
              "orderDate" => $row[orderDate],
              "orderPaymentStatus" => $row[orderPaymentStatus],
              "trackingDetails" => $row[trackingDetails],
              "clientName" => $row[clientName],
              "clientMobile" => $row[clientMobile],
              "clientEmail" => $row[clientEmail]
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