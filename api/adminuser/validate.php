<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/adminuser.php';
	

    $database = new Database();
    $db = $database->getConnection();

    $item = new Adminuser($db);

    $item->username = isset($_GET['username']) ? $_GET['username'] : die();
    $item->password = isset($_GET['password']) ? $_GET['password'] : die();
    

     $stmt = $item->validate();
	$itemCount = $stmt->rowCount();
    if($itemCount > 0){
			
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
			
			echo json_encode(array(
            "id" =>  $row['id'],
            "authorizedToApprovePayment" =>  $row['authorizedToApprovePayment'],
            "name" =>  $row['name'],
			"username" =>  $row['username'],
			"password" =>  $row['password'] ));
          
        }
		
    }
    else
    {
        echo json_encode(array(
            "id" =>  null,
            "authorizedToApprovePayment" =>  null,
            "name" => null,
			"username" => null,
			"password" =>  null ));
    }

?>