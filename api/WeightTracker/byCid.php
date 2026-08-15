<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/dataset.php';
	include_once '../../class/WeightTracker.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new WeightTracker($db);

    $item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();
    

     $stmt = $item->getByCid();
	$itemCount = $stmt->rowCount();
	//echo 'count'+$itemCount;
	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			
			echo json_encode(array(
            "id" =>  $row['id'],
            "cid" =>  $row['cid'],
			"date" =>  $row['date'],
			"weight" =>  $row['weight']));
          
        }
		
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>