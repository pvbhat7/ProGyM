<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/packages.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new packages($db);

    $data = json_decode(file_get_contents("php://input"));

            $item->days= $data->days;
			$item->fees= $data->fees;
			$item->gender= $data->gender;
			$item->description= $data->description;
			
    
    $resultId = $item->create();
    echo $resultId;
    return $resultId;
	
?>