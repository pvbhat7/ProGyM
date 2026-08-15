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

            $item->img= $data->img;
            $item->name= $data->name;
			$item->date= $data->date;
			$item->status= $data->status;
			$item->clientId= $data->clientId;
			$item->amount= $data->amount;
			$item->paymentStatus= $data->paymentStatus;
			$item->trackingDetails= $data->trackingDetails;
			$item->proCoinsUsed= $data->proCoinsUsed;
			$item->couponUsed= $data->couponUsed;
			
			
    $resultId = $item->createOrderFromApp();
    echo $resultId;
    return $resultId;
	
	
	
?>