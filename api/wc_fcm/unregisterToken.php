<?php
/**
 * Deactivate a token for a specific client. Called on explicit logout from the
 * Profile page. We don't DELETE the row — keeps the audit trail in case the
 * same browser later re-logs in, in which case registerToken.php will flip
 * is_active back to 'yes' via the ON DUPLICATE KEY UPDATE path.
 *
 * Body: { "client_id": 123, "token": "fXXX..." }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$client_id = isset($data['client_id']) ? (int)$data['client_id'] : 0;
$token     = isset($data['token'])     ? trim($data['token'])    : '';

if ($client_id <= 0 || $token === '') {
    http_response_code(400);
    echo json_encode(array("message" => "client_id and token are required."));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare(
    "UPDATE wc_fcm_tokens
        SET is_active = 'no', last_seen_at = NOW()
      WHERE token = :tk AND client_id = :cid"
);
$stmt->bindParam(':tk',  $token);
$stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
$stmt->execute();

echo json_encode(array("ok" => true));
?>
