<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/client.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new client($db);
    $item->gender = isset($_GET['gender']) ? $_GET['gender'] : die();
    
   
    $stmt = $item->getAllActiveClientsByGender();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			
			
           $objArray[$cnt] = array(
			"id" =>  $row['id'],
            "name" =>  $row['name'],
			"mobile" =>  $row['mobile'],
			"gender" =>  $row['gender'],
			"birthDate" =>  $row['birthDate'],
			"remarks" =>  $row['remarks'],
			"discontinue" =>  $row['discontinue'],
			"referPoints" =>  $row['referPoints'],
			"email" =>  $row['email'],
			"address" =>  $row['address'],
			"bloodGroup" =>  $row['bloodGroup'],
			"occupation" =>  $row['occupation'],
			"profileActiveFlag" =>  $row['profileActiveFlag'],
			"photo" =>  $row['photo'],
			"reference" =>  $row['reference'],
			"previousGym" =>  $row['previousGym'],
			"height" =>  $row['height'],
			"weight" =>  $row['weight'],
			"adp" =>  $row['adp'],
			"awp" =>  $row['awp'],			
			"isPTClient" =>  $row['isPTClient'],			
			"creationSource" =>  $row['creationSource'],			
			"isGymClient" =>  $row['isGymClient']
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