<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
    include_once '../../class/dietPlanTemplate.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new dietPlanTemplate($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    
    // employee values
			$item->cid= $data->cid;    
			$item->name= $data->name;    
			$item->createDate= $data->createDate;    
			$item->discontinue= $data->discontinue;    
			$item->time_1= $data->time_1;    
			$item->activity_1= $data->activity_1;    
			$item->time_2= $data->time_2;    
			$item->activity_2= $data->activity_2;    
			$item->time_3= $data->time_3;    
			$item->activity_3= $data->activity_3;    
			$item->time_4= $data->time_4;    
			$item->activity_4= $data->activity_4;    
			$item->time_5= $data->time_5;    
			$item->activity_5= $data->activity_5;    
			$item->time_6= $data->time_6;    
			$item->activity_6= $data->activity_6;    
			$item->time_7= $data->time_7;    
			$item->activity_7= $data->activity_7;    
			$item->time_8= $data->time_8;    
			$item->activity_8= $data->activity_8;
			$item->time_9= $data->time_9;    
			$item->activity_9= $data->activity_9;    
			$item->time_10= $data->time_10;    
			$item->activity_10= $data->activity_10;    
			$item->time_11= $data->time_11;    
			$item->activity_11= $data->activity_11;    
			$item->time_12= $data->time_12;    
			$item->activity_12= $data->activity_12;    
			$item->time_13= $data->time_13;    
			$item->activity_13= $data->activity_13;    
			$item->time_14= $data->time_14;    
			$item->activity_14= $data->activity_14;    
			$item->time_15= $data->time_15;    
			$item->activity_15= $data->activity_15;    
			$item->time_16= $data->time_16;    
			$item->activity_16= $data->activity_16;    
			$item->time_17= $data->time_17;    
			$item->activity_17= $data->activity_17;    
			$item->id= $data->id;	
    
    if($item->updateDietplantemplate()){
        echo json_encode("Dietplantemplate data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>