<?php
/**
 * Mark a FIFA coupon as redeemed. Called by the webapp right after a package
 * is successfully created / renewed with a validated coupon applied. Safe to
 * call twice — the WHERE clause protects against overwriting an existing
 * redemption timestamp.
 *
 * POST JSON: { client_id, coupon_code }
 * Response:  { ok:true, rows_affected:0|1 }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

include_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$client_id = isset($data['client_id']) ? (int)$data['client_id'] : 0;
$code      = isset($data['coupon_code']) ? strtoupper(trim((string)$data['coupon_code'])) : '';

if ($client_id <= 0 || $code === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing client_id or coupon_code']);
    exit;
}

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }

$st = $db->prepare("UPDATE wc_participants
                    SET fifa_coupon_redeemed_at = NOW()
                    WHERE client_id = ?
                      AND fifa_coupon = ?
                      AND fifa_coupon_redeemed_at IS NULL");
$st->execute([$client_id, $code]);
echo json_encode(['ok' => true, 'rows_affected' => $st->rowCount()]);
?>
