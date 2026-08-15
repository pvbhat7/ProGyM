<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/wall.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new wall($db);
	$item->clientId = isset($_GET['clientId']) ? $_GET['clientId'] : die();

    $stmt = $item->getByClientId();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
            $item->clientId= $data->clientId;
            $item->clientName= $data->clientName;
			$item->clientPhoto= $data->clientPhoto;
			$item->clientMobile= $data->clientMobile;
			$item->clientEmail= $data->clientEmail;
			$item->uploadDate= $data->uploadDate;
			$item->postPhoto= $data->postPhoto;
			$item->isApproved= $data->isApproved;
			$item->hashTag= $data->hashTag;
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           $objArray[$cnt] = array(
              "id" => $row[id],
              "clientId" => $row[clientId],
              "clientName" => $row[clientName],
              "clientPhoto" => $row[clientPhoto],
              "clientMobile" => $row[clientMobile],
              "clientEmail" => $row[clientEmail],
              "uploadDate" => $row[uploadDate],
              "postPhoto" => $row[postPhoto],
              "isApproved" => $row[isApproved],
              "hashTag" => $row[hashTag]
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