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

$data        = json_decode(file_get_contents("php://input"));
$batch_id    = isset($data->batch_id)    ? intval($data->batch_id) : 0;
$sent_ids    = isset($data->sent_ids)    ? array_map('strval', (array)$data->sent_ids)    : [];
$skipped_ids = isset($data->skipped_ids) ? array_map('strval', (array)$data->skipped_ids) : [];

$stmt = $db->prepare("SELECT pending_ids, sent_count, skipped_count FROM email_batch_log WHERE id = ?");
$stmt->execute([$batch_id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Batch not found']);
    exit;
}

$processed  = array_merge($sent_ids, $skipped_ids);
$pending    = json_decode($row['pending_ids'], true) ?: [];
$pending    = array_values(array_filter($pending, function($id) use ($processed) {
    return !in_array(strval($id), $processed);
}));

$new_sent    = intval($row['sent_count'])    + count($sent_ids);
$new_skipped = intval($row['skipped_count']) + count($skipped_ids);
$status      = count($pending) === 0 ? 'completed' : 'partial';

$stmt = $db->prepare(
    "UPDATE email_batch_log SET pending_ids = ?, sent_count = ?, skipped_count = ?, status = ? WHERE id = ?"
);
$stmt->execute([json_encode($pending), $new_sent, $new_skipped, $status, $batch_id]);

echo json_encode(['success' => true, 'pending_count' => count($pending), 'status' => $status]);
?>
