<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/CoinEarningRules.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new CoinEarningRules($db);

    $data = json_decode(file_get_contents("php://input"));

    $item->id         = $data->id;
    $item->coinAmount = $data->coinAmount;
    $item->isActive   = $data->isActive;

    date_default_timezone_set('Asia/Calcutta');
    $item->updatedAt  = date('d/m/Y');

    if($item->update()){
        echo json_encode(array("success" => true));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "message" => "Update failed."));
    }
?>
