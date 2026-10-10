<?php
/**
 * Admin → Settings → Attendance Alerts → "Test Notification".
 * POST → sends a sample "Test Member checked in" alert to every contact over the ON channels.
 * Returns { success, contacts, whatsapp: { on, sent, failed }, push: { on, devices, sent, failed } }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'POST only']);
    exit;
}

include_once '../../config/database.php';
include_once '../../config/mail_config.php';
include_once '../../class/AttendanceAlert.php';

try {
    $db = (new Database())->getConnection();
    $in   = json_decode(file_get_contents("php://input"), true) ?: [];
    $type = ($in['type'] ?? '') === 'signup' ? 'signup' : 'attendance';
    echo json_encode(array_merge(['success' => true, 'type' => $type], AttendanceAlert::sendTest($db, $type)));
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
