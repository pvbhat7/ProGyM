<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/batchlogs.php';
	

    $database = new Database();
    $db = $database->getConnection();

    $item = new batchlogs($db);

    $item->date = isset($_GET['date']) ? $_GET['date'] : die();
    
    $updatedRecords = $item->triggerEnableDisableProfileBatch();
    
    echo json_encode(array("records updated" =>  $updatedRecords != null ? $updatedRecords : 'nothing to update' ));
    

?>