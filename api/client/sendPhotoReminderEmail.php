<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

set_time_limit(60);

include_once '../../config/database.php';
include_once '../../class/PhotoReminderEmail.php';

$database = new Database();
$db       = $database->getConnection();

$data     = json_decode(file_get_contents("php://input"));
$clientId = isset($data->clientId) ? intval($data->clientId) : 0;

if ($clientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid client ID']);
    exit;
}

$result = PhotoReminderEmail::send($db, $clientId);

if ($result === 'ok') {
    echo json_encode(['sent' => 1, 'skipped' => 0]);
} elseif ($result === 'no_email') {
    echo json_encode(['sent' => 0, 'skipped' => 1, 'reason' => 'no_email']);
} else {
    echo json_encode(['sent' => 0, 'skipped' => 0, 'error' => $result]);
}
