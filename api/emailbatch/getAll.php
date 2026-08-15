<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$stmt = $db->query(
    "SELECT id, batch_type, created_at, total_selected, sent_count, skipped_count, status,
            JSON_LENGTH(pending_ids) as pending_count
     FROM email_batch_log
     ORDER BY created_at DESC
     LIMIT 50"
);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
?>
