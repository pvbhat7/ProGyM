<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

set_time_limit(60);

include_once '../../config/database.php';
include_once '../../class/WelcomeEmail.php';

$database = new Database();
$db       = $database->getConnection();

$data     = json_decode(file_get_contents("php://input"));
$clientId = isset($data->clientId) ? intval($data->clientId) : 0;

if ($clientId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid client ID']);
    exit;
}

// Check email exists before attempting send
$stmt = $db->prepare("SELECT email FROM client WHERE id = ? LIMIT 1");
$stmt->execute([$clientId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row || empty(trim($row['email'] ?? ''))) {
    echo json_encode(['sent' => 0, 'skipped' => 1, 'reason' => 'no_email']);
    exit;
}

$ok = WelcomeEmail::send($db, $clientId);
echo json_encode($ok ? ['sent' => 1, 'skipped' => 0] : ['sent' => 0, 'skipped' => 0, 'error' => 'send_failed']);
