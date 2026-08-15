<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/packageDetails.php';
    include_once '../../class/paymenttransaction.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new packagedetails($db);
    
    $item->clientId = isset($_GET['clientId']) ? $_GET['clientId'] : die();


    $stmt = $item->getByClientId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
		
			 
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
            $tx_item = new paymenttransaction($db);
            $tx_item->packageDetailsId = $row['id'];
            
        
            $tx_stmt = $tx_item->getByPackageDetailsid();
        	$tx_itemCount = $tx_stmt->rowCount();
        	

        	$tx_cnt = 0;
            if($tx_itemCount > 0){
                
                while ($tx_row = $tx_stmt->fetch(PDO::FETCH_ASSOC)){
                    extract($tx_row);
                    
                   $tx_objArray[$tx_cnt] = array(
                    "id" =>  $tx_row['id'],
        			"packageDetailsId" =>  $tx_row['packageDetailsId'],
        			"feesPaid" =>  $tx_row['feesPaid'],
                    "paymentDate" =>  $tx_row['paymentDate'],
        			"isApproved" =>  $tx_row['isApproved'],
        			"clientGender" =>  $tx_row['clientGender'],
        			"clientId" =>  $tx_row['clientId'],
        			"paymentMode" =>  $tx_row['paymentMode'],
        			"discontinue" =>  $tx_row['discontinue'],
        			"proCoinsUsed" =>  $tx_row['proCoinsUsed'] ?? '0'
                    );
                    
                    $tx_cnt = $tx_cnt + 1;
                }
            }
            
            
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
			"discontinue" =>  $row['discontinue'],
			"paymentTransactions" => $tx_objArray
            );
            
            for ($x = 0; $x <= $tx_cnt; $x++) {
             unset($tx_objArray[$x]);
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