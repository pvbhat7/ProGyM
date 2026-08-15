<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/dataset.php';
	include_once '../../class/client.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Dataset($db);

    $item->mobile = isset($_GET['mobile']) ? $_GET['mobile'] : die();
    

     $stmt = $item->getClientAndPackagedetailsByMobile();
	$itemCount = $stmt->rowCount();
	//echo 'count'+$itemCount;
	$cnt = 0;
    if($itemCount > 0){
		
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			
			echo json_encode(array(
            "cid" =>  $row['id'],
            "name" =>  $row['name'],
            "profileActiveFlag" =>  $row['profileActiveFlag'],
			"discontinue" =>  $row['discontinue'],
			"photo" =>  $row['photo'],
			"startDate" =>  $row['startDate'],
			"endDate" =>  $row['endDate'],
			"fees" =>  $row['fees'],
			"amountPaid" =>  $row['amountPaid'] ));
          
        }
		
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
?>