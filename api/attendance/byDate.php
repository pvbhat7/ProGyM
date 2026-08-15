<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/attendance.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new attendance($db);
    
    $item->date = isset($_GET['date']) ? $_GET['date'] : die();
    $item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();


    $stmt = $item->getByDate();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
          
           
       
		echo json_encode(array(
            "id" =>  $row['id'],
			"cid" =>  $row['cid'],
			"status" =>  $row['status'],
            "day" =>  $row['day'],
            "month" =>  $row['month'], 
             "year" =>  $row['year'], 
             "timeStamp" =>  $row['timeStamp'], 
             "date" =>  $row['date']
            ));
            
        }
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>