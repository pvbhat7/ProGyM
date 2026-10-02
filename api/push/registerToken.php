<?php
/**
 * Register (or refresh) a browser's FCM token for a ProGym member.
 *
 * Body: { "clientId": 123, "token": "fXXX...", "userAgent": "Mozilla/..." }
 *
 * `token` is UNIQUE — if another member logs in on the same browser the token
 * is re-bound to them, so only the latest member gets pushes on that device.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data      = json_decode(file_get_contents("php://input"), true);
$clientId  = isset($data['clientId'])  ? (int)$data['clientId'] : 0;
$token     = isset($data['token'])     ? trim($data['token'])   : '';
$userAgent = isset($data['userAgent']) ? substr(trim($data['userAgent']), 0, 255) : '';

if ($clientId <= 0 || $token === '' || strlen($token) > 512) {
    http_response_code(400);
    echo json_encode(array("success" => false, "message" => "clientId and token are required."));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare(
    "INSERT INTO push_tokens (client_id, token, user_agent, created_at, last_seen_at, is_active)
     VALUES (?, ?, ?, NOW(), NOW(), 'yes')
     ON DUPLICATE KEY UPDATE
        client_id    = VALUES(client_id),
        user_agent   = VALUES(user_agent),
        last_seen_at = NOW(),
        is_active    = 'yes'"
);
$stmt->execute(array($clientId, $token, $userAgent));

echo json_encode(array("success" => true));
?>
