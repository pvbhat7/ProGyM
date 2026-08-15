<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/fcmToken.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new fcmToken($db);

    $stmt = $item->getAll();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
            $item->id= $data->id;
            $item->mobile= $data->mobile;
            $item->token= $data->token;
			$item->discontinue= $data->discontinue;
			
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           $objArray[$cnt] = array(
              "id" => $row[id],
              "mobile" => $row[mobile],
              "token" => $row[token],
              "discontinue" => $row[discontinue]
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