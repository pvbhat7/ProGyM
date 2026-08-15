<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/tasks.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new tasks($db);
    
    $item->date = isset($_GET['date']) ? $_GET['date'] : die();


    $stmt = $item->getAllByDate();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
          
           $objArray[$cnt] = array(
            "id" =>  $row['id'],
			"name" =>  $row['name'],
			"img" =>  $row['img'],
            "timing" =>  $row['timing'],
            "description" =>  $row['description'], 
             "date" =>  $row['date'], 
             "submitStatus" =>  $row['submitStatus'], 
             "submitImg" =>  $row['submitImg'], 
             "submitTimestamp" =>  $row['submitTimestamp'],
             "isApproved" =>  $row['isApproved'],
             "points" =>  $row['points']
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