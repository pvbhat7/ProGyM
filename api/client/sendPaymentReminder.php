<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../class/ReminderEmail.php';

$database = new Database();
$db = $database->getConnection();

$clientId = isset($_GET['id']) ? intval($_GET['id']) : 0;
if (!$clientId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing client id']);
    exit;
}

$sent = ReminderEmail::send($db, $clientId);

if ($sent) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Could not send email (client may have no email address or no package)']);
}
?>
