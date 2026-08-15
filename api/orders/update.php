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
    
    $data = json_decode(file_get_contents("php://input"));
    
    // employee values
            $item->img= $data->img;
			$item->name= $data->name;
			$item->date= $data->date;
			$item->status= $data->status;
			$item->clientId= $data->clientId;
			$item->amount= $data->amount;
			$item->txnId= $data->txnId;
			$item->order_id= $data->order_id;	
			$item->paymentStatus= $data->paymentStatus;	
			$item->trackingDetails= $data->trackingDetails;	
			$item->proCoinsUsed= $data->proCoinsUsed;	
			$item->couponUsed= $data->couponUsed;	
			
			
			    
    if($item->updateOrderFromApp()){
        echo json_encode("Employee data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>