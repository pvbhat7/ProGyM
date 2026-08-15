<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once '../../config/database.php';
include_once '../../class/ApprovedDevice.php';

$db = (new Database())->getConnection();
$device = new ApprovedDevice($db);

$data = json_decode(file_get_contents("php://input"));
if (!isset($data->id)) {
    echo json_encode(['success' => false, 'message' => 'Missing id']);
    exit();
}

$device->id    = $data->id;
$device->label = isset($data->label) ? trim($data->label) : '';

echo json_encode(['success' => $device->updateLabel()]);
?>
