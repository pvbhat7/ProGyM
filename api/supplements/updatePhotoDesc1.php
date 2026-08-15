<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
	include_once '../../class/Supplements.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new supplements($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    // employee values
			$item->productPhotoDesc1= $data->productPhotoDesc1;
			$item->id= $data->id;	
			
			    
    if($item->updateSupplementsPhotoDesc1()){
        echo json_encode("Employee data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>