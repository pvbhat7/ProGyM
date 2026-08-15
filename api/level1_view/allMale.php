<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/level1_view.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Level_1_profile_card($db);
    
   

    $stmt = $item->getLevelOneProfileCardMale();
    
	$itemCount = $stmt->rowCount();

	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
           $objArray[$cnt] = array(
			"profileId" =>  $row['profileId'],
            "firstName" =>  $row['firstName'],
			"lastName" =>  $row['lastName'],
			"dob" =>  $row['dob']);
            
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