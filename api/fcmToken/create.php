<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/fcmToken.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new fcmToken($db);

    $data = json_decode(file_get_contents("php://input"));

            $item->mobile= $data->mobile;
            $item->token= $data->token;
			$item->discontinue= $data->discontinue;
	
			
			
            
            
    $resultId = $item->create();
     echo $resultId;
    return $resultId;
	
	
	//echo $item->createClient();
	
?>