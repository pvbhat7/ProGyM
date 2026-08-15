<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
    include_once '../../class/packageDetails.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new packageDetails($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    
			$item->id= $data->id;	
			$item->description= $data->description;
			$item->fees= $data->fees;
			$item->startDate= $data->startDate;
			$item->endDate= $data->endDate;
			$item->amountPaid= $data->amountPaid;
			$item->paymentDate= $data->paymentDate;
			$item->status= $data->status;
			$item->packageId= $data->packageId;
			$item->clientId= $data->clientId;
			$item->discontinue= $data->discontinue;
			
    
    if($item->update()){
        echo json_encode("packageDetails data updated.");
    } else{
        echo json_encode("packageDetails could not be updated");
    }
?>