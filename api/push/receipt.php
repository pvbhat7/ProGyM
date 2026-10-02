<?php
/**
 * Delivery receipts posted by the push service worker.
 *
 * Body: { "nid": 12, "tid": 34, "event": "delivered" | "clicked" }
 *   nid = push_broadcasts.id, tid = push_tokens.id
 *
 * Only the first timestamp is kept (COALESCE), so repeated receipts are harmless.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data  = json_decode(file_get_contents("php://input"), true);
$nid   = isset($data['nid'])   ? (int)$data['nid'] : 0;
$tid   = isset($data['tid'])   ? (int)$data['tid'] : 0;
$event = isset($data['event']) ? $data['event']    : '';

$column = $event === 'delivered' ? 'delivered_at' : ($event === 'clicked' ? 'clicked_at' : null);
if ($nid <= 0 || $tid <= 0 || $column === null) {
    http_response_code(400);
    echo json_encode(array("success" => false));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("UPDATE push_delivery_log SET $column = COALESCE($column, NOW()) WHERE broadcast_id = ? AND token_id = ?");
$stmt->execute(array($nid, $tid));
// A click proves delivery too (receipt may have been lost offline).
if ($event === 'clicked') {
    $db->prepare("UPDATE push_delivery_log SET delivered_at = COALESCE(delivered_at, NOW()) WHERE broadcast_id = ? AND token_id = ?")
       ->execute(array($nid, $tid));
}

echo json_encode(array("success" => true));
?>
