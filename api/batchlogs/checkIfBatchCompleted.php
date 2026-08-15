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

    $item->batchName = isset($_GET['batchName']) ? $_GET['batchName'] : die();
    $item->date = isset($_GET['date']) ? $_GET['date'] : die();
    

     $stmt = $item->checkIfBatchCompleted();
	$itemCount = $stmt->rowCount();
    if($itemCount > 0){
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			
			echo json_encode(array(
			"status" =>  'true' ));
        }
		
    }
    else
    {
        echo json_encode(array(
            "status" =>  'false' ));
    }

?>