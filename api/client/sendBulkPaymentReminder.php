<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

include_once '../../config/database.php';
include_once '../../class/ReminderEmail.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));
$clientIds = isset($data->clientIds) && is_array($data->clientIds) ? $data->clientIds : [];

if (count($clientIds) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'No client IDs provided']);
    exit;
}

$sent    = 0;
$skipped = 0;

foreach ($clientIds as $rawId) {
    $id = intval($rawId);
    if ($id <= 0) { $skipped++; continue; }
    $ok = ReminderEmail::send($db, $id);
    if ($ok) $sent++; else $skipped++;
}

echo json_encode(['sent' => $sent, 'skipped' => $skipped]);
?>
