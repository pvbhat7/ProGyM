<?php
/**
 * Register (or refresh) a browser's FCM token for a wc2026 client.
 *
 * Body: { "client_id": 123, "token": "fXXX...", "user_agent": "Mozilla/..." }
 *
 * Multi-user-on-same-device semantics:
 *   The `token` column is UNIQUE. The same browser always gets the same FCM
 *   token. If a different user logs in on that device, ON DUPLICATE KEY
 *   UPDATE rebinds the token to the latest client_id and re-activates it.
 *   Effect: only the latest user receives pushes on that device.
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$client_id  = isset($data['client_id'])  ? (int)$data['client_id'] : 0;
$token      = isset($data['token'])      ? trim($data['token'])    : '';
$user_agent = isset($data['user_agent']) ? substr(trim($data['user_agent']), 0, 255) : '';

if ($client_id <= 0 || $token === '') {
    http_response_code(400);
    echo json_encode(array("message" => "client_id and token are required."));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$sql = "INSERT INTO wc_fcm_tokens
        (client_id, token, platform, user_agent, created_at, last_seen_at, is_active)
        VALUES (:cid, :tk, 'web', :ua, NOW(), NOW(), 'yes')
        ON DUPLICATE KEY UPDATE
            client_id    = VALUES(client_id),
            user_agent   = VALUES(user_agent),
            last_seen_at = NOW(),
            is_active    = 'yes'";
$stmt = $db->prepare($sql);
$stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
$stmt->bindParam(':tk',  $token);
$stmt->bindParam(':ua',  $user_agent);
$stmt->execute();

echo json_encode(array("ok" => true, "client_id" => $client_id));
?>
