<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/orders.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Orders($db);

	$item->order_id = isset($_GET['order_id']) ? $_GET['order_id'] : die();
	$item->status = isset($_GET['status']) ? $_GET['status'] : die();

    $stmt = $item->updateOrderStatus();
    http_response_code(200);
?>