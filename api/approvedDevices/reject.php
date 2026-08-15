<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';
include_once '../../class/ApprovedDevice.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || empty($data->id)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Device ID required."]);
    exit;
}

$item = new ApprovedDevice($db);
$item->id = (int)$data->id;

if ($item->reject()) {
    echo json_encode(["success" => true, "message" => "Device rejected."]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to reject device."]);
}
?>
