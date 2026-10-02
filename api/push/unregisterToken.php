<?php
/**
 * Deactivate a browser's FCM token (member logged out on this device).
 *
 * Body: { "clientId": 123, "token": "fXXX..." }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data     = json_decode(file_get_contents("php://input"), true);
$clientId = isset($data['clientId']) ? (int)$data['clientId'] : 0;
$token    = isset($data['token'])    ? trim($data['token'])   : '';

if ($clientId <= 0 || $token === '') {
    http_response_code(400);
    echo json_encode(array("success" => false, "message" => "clientId and token are required."));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("UPDATE push_tokens SET is_active = 'no' WHERE token = ? AND client_id = ?");
$stmt->execute(array($token, $clientId));

echo json_encode(array("success" => true));
?>
