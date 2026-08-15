<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/Feedback.php';

    $database = new Database();
    $db = $database->getConnection();
    
    

    $item = new Feedback($db);
    
    
    $item->clientId = isset($_GET['clientId']) ? $_GET['clientId'] : die();
    $item->name = isset($_GET['name']) ? $_GET['name'] : die();
    $item->email = isset($_GET['email']) ? $_GET['email'] : die();
    $item->mobile = isset($_GET['mobile']) ? $_GET['mobile'] : die();
    $item->feedback = isset($_GET['feedback']) ? $_GET['feedback'] : die();
    

    $item->create();

	
	//echo $item->createClient();
	
?>