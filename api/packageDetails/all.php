<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/packageDetails.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new packagedetails($db);
    


    $stmt = $item->getAll();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
           $objArray[$cnt] = array(
            "id" =>  $row['id'],
			"description" =>  $row['description'],
			"fees" =>  $row['fees'],
            "startDate" =>  $row['startDate'],
            "endDate" =>  $row['endDate'],          
			"amountPaid" =>  $row['amountPaid'],            
			"paymentDate" =>  $row['paymentDate'],            
			"status" =>  $row['status'],            
			"packageId" =>  $row['packageId'],            
			"clientId" =>  $row['clientId'],            
			"discontinue" =>  $row['discontinue']            
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