<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$data = json_decode(file_get_contents("php://input"), true);
$key  = trim($data['key'] ?? '');
$val  = $data['value'] ?? null;

$allowed = ['showProCoinsPanel', 'showFifaUi', 'whatsappAttendanceAlert', 'pushAttendanceAlert', 'alertAttendance', 'alertSignup', 'razorpayMemberPayments'];
if (!in_array($key, $allowed) || $val === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid key or missing value']);
    exit;
}

$path  = __DIR__ . '/../../config/feature_flags.json';
$flags = [];

if (file_exists($path)) {
    $raw   = file_get_contents($path);
    $flags = json_decode($raw, true);
    if (!is_array($flags)) $flags = [];
}

$flags[$key] = (bool)$val;

file_put_contents($path, json_encode($flags, JSON_PRETTY_PRINT));

echo json_encode(['success' => true, 'flags' => $flags]);
?>
