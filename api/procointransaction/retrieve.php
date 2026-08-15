<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/procointransaction.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Procointransaction($db);

	$item->clientId = isset($_GET['clientId']) ? $_GET['clientId'] : die();

    $stmt = $item->getProcointransactionByClientId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           $objArray[$cnt] = array(
              "id" => $row[id],
              "txnId" => $row[txnId],
              "des" => $row[des],
              "amount" => $row[amount],
              "creditDebit" => $row[creditDebit],
              "txnDate" => $row[txnDate],
              "clientId" => $row[clientId]
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