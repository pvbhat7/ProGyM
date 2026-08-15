<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/dietPlanTemplate.php';
error_reporting(0);
    $database = new Database();
    $db = $database->getConnection();
    $item = new dietPlanTemplate($db);
	
    $item->id = isset($_GET['id']) ? $_GET['id'] : die();
  
     $stmt = $item->getDietplantemplateById();

    $itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
           $objArray[$cnt] = array(
              "id" =>  $row['id'],    
            "cid" =>  $row['cid'],    
			"name" =>  $row['name'],    
			"createDate" =>  $row['createDate'],    
			"discontinue" =>  $row['discontinue'],    
			"time_1" =>  $row['time_1'],    
			"activity_1" =>  $row['activity_1'],    
			"time_2" =>  $row['time_2'],    
			"activity_2" =>  $row['activity_2'],    
			"time_3" =>  $row['time_3'],    
			"activity_3" =>  $row['activity_3'],    
			"time_4" =>  $row['time_4'],    
			"activity_4" =>  $row['activity_4'],    
			"time_5" =>  $row['time_5'],    
			"activity_5" =>  $row['activity_5'],    
			"time_6" =>  $row['time_6'],    
			"activity_6" =>  $row['activity_6'],    
			"time_7" =>  $row['time_7'],    
			"activity_7" =>  $row['activity_7'],    
			"time_8" =>  $row['time_8'],    
			"activity_8" =>  $row['activity_8'],
			"time_9" =>  $row['time_9'],    
			"activity_9" =>  $row['activity_9'],    
			"time_10" =>  $row['time_10'],    
			"activity_10" =>  $row['activity_10'],    
			"time_11" =>  $row['time_11'],    
			"activity_11" =>  $row['activity_11'],    
			"time_12" =>  $row['time_12'],    
			"activity_12" =>  $row['activity_12'],    
			"time_13" =>  $row['time_13'],    
			"activity_13" =>  $row['activity_13'],    
			"time_14" =>  $row['time_14'],    
			"activity_14" =>  $row['activity_14'],    
			"time_15" =>  $row['time_15'],    
			"activity_15" =>  $row['activity_15'],    
			"time_16" =>  $row['time_16'],    
			"activity_16" =>  $row['activity_16'],    
			"time_17" =>  $row['time_17'],    
			"activity_17" =>  $row['activity_17']			
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