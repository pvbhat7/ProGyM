<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
	include_once '../../class/wall.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new wall($db);
    
    $item->id = isset($_GET['id']) ? $_GET['id'] : die();
	$item->isApproved = isset($_GET['isApproved']) ? $_GET['isApproved'] : die();
			
			    
    if($item->update()){
        echo json_encode("Employee data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>