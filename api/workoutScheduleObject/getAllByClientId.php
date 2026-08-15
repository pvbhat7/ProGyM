<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WorkoutScheduleObject.php';
    include_once '../../class/WorkoutSubType.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new WorkoutScheduleObject($db);

	$item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();

  
    $stmt = $item->getAllByClientId();
    
    $itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
             $s_item = new WorkoutSubType($db);

        	$s_item->wsoid = $row['id'];
        
            $s_stmt = $s_item->getSubWorkoutPlanObjectByWsoId();
        	$s_itemCount = $s_stmt->rowCount();

        	$s_cnt = 0;
            if($s_itemCount > 0){
                
                while ($s_row = $s_stmt->fetch(PDO::FETCH_ASSOC)){
                    extract($s_row);
                   $s_objArray[$s_cnt] = array(
                      "id" => $s_row[id],
                      "wsoid" => $s_row[wsoid],
                      "twsid" => $s_row[twsid],
                      "maxReps" => $s_row[maxReps],
                      "sets" => $s_row[sets],
                      "discontinue" => $s_row[discontinue],
                      "clientPerformance" => $s_row[clientPerformance],
                      "image" => $s_row[image]
                    );
                    
                    $s_cnt = $s_cnt + 1;
                }
        		//echo json_encode($objArray);
            }
            
           $objArray[$cnt] = array(
              "id" =>  $row['id'],    
            "cid" =>  $row['cid'] ,   
            "mtid" =>  $row['mtid'],    
			"date" =>  $row['date'],
			"discontinue" =>  $row['discontinue'],
			"workoutSubTypeList" =>  $s_objArray
            );
            
            for ($x = 0; $x <= $s_cnt; $x++) {
             unset($s_objArray[$x]);
            }
            
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