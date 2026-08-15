<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/enquiry.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new enquiry($db);

    $data = json_decode(file_get_contents("php://input"));
    
            $item->name= $data->name;
			$item->mobile= $data->mobile;
			$item->email= $data->email;
			$item->updateDate= $data->updateDate;
			$item->trainer= $data->trainer;
			
    
    $resultId = $item->create();
    echo $resultId;
    return $resultId;
	
?>