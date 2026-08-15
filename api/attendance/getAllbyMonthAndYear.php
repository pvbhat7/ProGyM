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
    
    $item->month = isset($_GET['month']) ? $_GET['month'] : die();
    $item->year = isset($_GET['year']) ? $_GET['year'] : die();


    $stmt = $item->getAllByMonthAndYear();
	$itemCount = $stmt->rowCount();

	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
          
           $objArray[$cnt] = array(
           "id" =>  $row['id'],
			"cid" =>  $row['cid'],
			"status" =>  $row['status'],
            "day" =>  $row['day'],
            "month" =>  $row['month'], 
             "year" =>  $row['year'], 
             "timeStamp" =>  $row['timeStamp'], 
             "date" =>  $row['date']
            );
            
            $cnt = $cnt + 1;
        }
		echo json_encode($objArray);
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>