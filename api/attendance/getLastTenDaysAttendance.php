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
    

    $stmt = $item->getLastTenDaysAttendance();
	$itemCount = $stmt->rowCount();

	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
          
           $objArray[$cnt] = array(
			"cid" =>  $row['cid'],
			"name" =>  $row['name'],
			"gender" =>  $row['gender'],
			"mobile" =>  $row['mobile'],
            "date" =>  $row['date'],
             "timeStamp" =>  $row['timeStamp']
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