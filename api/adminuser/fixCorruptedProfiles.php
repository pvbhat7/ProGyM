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
    

     $stmt = $item->fixProfile();
     
     echo json_encode(array("result" =>  "fix successful"));


?>