<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
	include_once '../../class/procointransaction.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new procointransaction($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    // employee values
            $item->txnId= $data->txnId;
			$item->des= $data->des;
			$item->amount= $data->amount;
			$item->creditDebit= $data->creditDebit;
			$item->txnDate= $data->txnDate;
			$item->clientId= $data->clientId;
			$item->id= $data->id;
			
			    
    if($item->updateProcointransactionFromApp()){
        echo json_encode("Procointransaction data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>