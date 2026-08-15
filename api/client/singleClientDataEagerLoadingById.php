<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/client.php';
	include_once '../../config/database.php';
    include_once '../../class/packageDetails.php';
    include_once '../../class/paymenttransaction.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Client($db);

    $item->id = isset($_GET['id']) ? $_GET['id'] : die();
    
    
 
    $stmt = $item->getClient();
	$itemCount = $stmt->rowCount();

	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
            
            $packageDetailsObj = new packagedetails($db);    
            $packageDetailsObj->clientId = isset($_GET['id']) ? $_GET['id'] : die();
            $packageDetailsStmt = $packageDetailsObj->getByClientId();
        	$packageDetailsCount = $packageDetailsStmt->rowCount();	
        	$packageDetailsIndex = 0;
            if($packageDetailsCount > 0){		
        			 
               while ($packageDetailsRow = $packageDetailsStmt->fetch(PDO::FETCH_ASSOC)){
                    extract($packageDetailsRow);
                    
                    $paymentTransactionObject = new paymenttransaction($db);
                    $paymentTransactionObject->packageDetailsId = $packageDetailsRow['id'];
                    $paymentTransactionStmt = $paymentTransactionObject->getByPackageDetailsid();
                	$paymentTransactionCount = $paymentTransactionStmt->rowCount();
                	$paymentTransactionIndex = 0;
                    if($paymentTransactionCount > 0){
                        
                        while ($paymentTransactionRow = $paymentTransactionStmt->fetch(PDO::FETCH_ASSOC)){
                            extract($paymentTransactionRow);
                            
                           $paymentTransactionArray[$paymentTransactionIndex] = array(
                            "id" =>  $paymentTransactionRow['id'],
                			"packageDetailsId" =>  $paymentTransactionRow['packageDetailsId'],
                			"feesPaid" =>  $paymentTransactionRow['feesPaid'],
                            "paymentDate" =>  $paymentTransactionRow['paymentDate'],
                			"isApproved" =>  $paymentTransactionRow['isApproved'],
                			"clientGender" =>  $paymentTransactionRow['clientGender'],
                			"clientId" =>  $paymentTransactionRow['clientId'],
                			"paymentMode" =>  $paymentTransactionRow['paymentMode'],
                			"discontinue" =>  $paymentTransactionRow['discontinue']       
                            );
                            
                            $paymentTransactionIndex = $paymentTransactionIndex + 1;
                        }
                    }
                    
                    
                   $packageDetailsArray[$packageDetailsIndex] = array(
                    "id" =>  $packageDetailsRow['id'],
        			"description" =>  $packageDetailsRow['description'],
        			"fees" =>  $packageDetailsRow['fees'],
                    "startDate" =>  $packageDetailsRow['startDate'],
                    "endDate" =>  $packageDetailsRow['endDate'],          
        			"amountPaid" =>  $packageDetailsRow['amountPaid'],            
        			"paymentDate" =>  $packageDetailsRow['paymentDate'],            
        			"status" =>  $packageDetailsRow['status'],            
        			"packageId" =>  $packageDetailsRow['packageId'],            
        			"clientId" =>  $packageDetailsRow['clientId'],            
        			"discontinue" =>  $packageDetailsRow['discontinue'],
        			"paymentTransactions" => $paymentTransactionArray
                    );
                    
                    for ($x = 0; $x <= $paymentTransactionIndex; $x++) {
                     unset($paymentTransactionArray[$x]);
                    }
                    
                    $packageDetailsIndex = $packageDetailsIndex + 1;
                    
                }
        		
        		// print json
        		//echo json_encode($packageDetailsArray);
            }
			
			echo json_encode(array(
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
			"isGymClient" =>  $row['isGymClient'],
			"packageDetailsList" =>  $packageDetailsArray,
            ));
          
        }
		
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>