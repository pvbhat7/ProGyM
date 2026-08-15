<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
    include_once '../../class/Dietplanobjecttable.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new Dietplanobjecttable($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    $item->id = isset($_GET['dietObjectId']) ? $_GET['dietObjectId'] : die();
    $item->discontinue = isset($_GET['colName']) ? $_GET['colName'] : die();
    
    
    if($item->updateClientDietPlanStatus()){
        echo json_encode("data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>