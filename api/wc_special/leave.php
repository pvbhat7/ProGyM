<?php
// Permanently eliminate the requesting client from Knockout Bonanza.
// POST /api/wc_special/leave.php  JSON body: { client_id }
//
// After success, the client:
//   - is stored in wc_special_eliminated (never expires)
//   - has all wc_special_predictions rows soft-deleted (discontinue='true')
//   - has their wc_special_tiebreaker row soft-deleted
//   - is blocked from future submit / tiebreaker calls
// There is intentionally no rejoin endpoint.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcSpecialElimination.php';

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid JSON body']);
    exit;
}
$client_id = isset($body['client_id']) ? (int)$body['client_id'] : 0;
if ($client_id <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'client_id required']);
    exit;
}

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }

$el = new WcSpecialElimination($db);
$res = $el->markEliminated($client_id);
if (!$res['ok']) {
    http_response_code(400);
    echo json_encode($res);
    exit;
}
echo json_encode(['ok' => true, 'eliminated' => true]);
?>
