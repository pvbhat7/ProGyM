<?php
/**
 * Validate a FIFA thank-you coupon for a specific client.
 *
 * POST JSON: { client_id, coupon_code }
 * Rules:
 *   - coupon must exist on wc_participants.fifa_coupon
 *   - coupon must belong to the same client_id (non-transferable)
 *   - coupon must not already be redeemed
 * Success: { ok:true, discount_percent:50, coupon_code:"PROGYM50-XXXXX" }
 * Failure: { ok:false, error:"..." } (HTTP 200 so frontend can render the message)
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

$st = $db->prepare("SELECT client_id, fifa_coupon, fifa_coupon_redeemed_at, fifa_discount_percent
                    FROM wc_participants
                    WHERE fifa_coupon = ? LIMIT 1");
$st->execute([$code]);
$row = $st->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    echo json_encode(['ok' => false, 'error' => 'Invalid coupon code']);
    exit;
}
if ((int)$row['client_id'] !== $client_id) {
    echo json_encode(['ok' => false, 'error' => 'This coupon belongs to another member — not this one']);
    exit;
}
if (!empty($row['fifa_coupon_redeemed_at'])) {
    echo json_encode(['ok' => false, 'error' => 'Coupon already redeemed on ' . $row['fifa_coupon_redeemed_at']]);
    exit;
}

// Per-user discount percent (falls back to 50 for legacy rows written before
// the fifa_discount_percent column existed).
$pct = isset($row['fifa_discount_percent']) && $row['fifa_discount_percent'] !== null
       ? (int)$row['fifa_discount_percent']
       : 50;
if ($pct < 0 || $pct > 100) $pct = 50;

echo json_encode([
    'ok'               => true,
    'discount_percent' => $pct,
    'coupon_code'      => $row['fifa_coupon'],
]);
?>
