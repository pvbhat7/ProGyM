<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WorkoutSubType.php';
error_reporting(0);
    $database = new Database();
    $db = $database->getConnection();

    $item = new WorkoutSubType($db);

	$item->wsoid = isset($_GET['wsoid']) ? $_GET['wsoid'] : die();

    $stmt = $item->getSubWorkoutPlanObjectByWsoId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           $objArray[$cnt] = array(
              "id" => $row[id],
              "wsoid" => $row[wsoid],
              "twsid" => $row[twsid],
              "maxReps" => $row[maxReps],
              "sets" => $row[sets],
              "discontinue" => $row[discontinue],
              "clientPerformance" => $row[clientPerformance],
              "image" => $row[image]
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