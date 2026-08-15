<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/diettimeslots.php';
	

    $database = new Database();
    $db = $database->getConnection();

    $item = new diettimeslots($db);

    

     $stmt = $item->getAll();
	$itemCount = $stmt->rowCount();
    if($itemCount > 0){
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			
			echo json_encode(array(
            "id" =>  $row['id'],
            "time_1" =>  $row['time_1'],
            "time_2" =>  $row['time_2'],
            "time_3" =>  $row['time_3'],
            "time_4" =>  $row['time_4'],
            "time_5" =>  $row['time_5'],
            "time_6" =>  $row['time_6'],
            "time_7" =>  $row['time_7'],
            "time_8" =>  $row['time_8'],
            "time_9" =>  $row['time_9'],
            "time_10" =>  $row['time_10'],
            "time_11" =>  $row['time_11'],
            "time_12" =>  $row['time_12'],
            "time_13" =>  $row['time_13'],
            "time_14" =>  $row['time_14'],
            "time_15" =>  $row['time_15'],
            "time_16" =>  $row['time_16'],
            "time_17" =>  $row['time_17']));
          
        }
		
    }
    
?>