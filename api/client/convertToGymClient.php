<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/client.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new client($db);
    
    $item->id = isset($_GET['clientId']) ? $_GET['clientId'] : die();


    $stmt = $item->convertToGymClient();
	
?>