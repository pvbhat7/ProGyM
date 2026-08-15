<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/enquiry.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new enquiry($db);
    
    $item->trainer = isset($_GET['trainer']) ? $_GET['trainer'] : die();


    $stmt = $item->byGreaterThanDate();
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
            "email" =>  $row['email'],
            "updateDate" =>  $row['updateDate'], 
             "status" =>  $row['status'], 
             "discontinue" =>  $row['discontinue'], 
             "trainer" =>  $row['trainer']
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