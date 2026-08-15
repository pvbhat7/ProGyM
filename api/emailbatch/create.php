<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data           = json_decode(file_get_contents("php://input"));
$batch_type     = isset($data->batch_type)     ? $data->batch_type              : '';
$total_selected = isset($data->total_selected) ? intval($data->total_selected)  : 0;
$pending_ids    = isset($data->pending_ids)    ? $data->pending_ids             : [];

$stmt = $db->prepare(
    "INSERT INTO email_batch_log (batch_type, created_at, total_selected, sent_count, skipped_count, pending_ids, status)
     VALUES (?, NOW(), ?, 0, 0, ?, 'running')"
);
$stmt->execute([$batch_type, $total_selected, json_encode($pending_ids)]);

echo json_encode(['id' => $db->lastInsertId()]);
?>
