<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
	include_once '../../class/Merchandise.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new merchandise($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    // employee values
			$item->productName= $data->productName;
			$item->oldPrice= $data->oldPrice;
			$item->newPrice= $data->newPrice;
			$item->discontinue= $data->discontinue;
			$item->productPhoto= $data->productPhoto;
			$item->id= $data->id;	
			
			    
    if($item->updateMerchandise()){
        echo json_encode("Employee data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>