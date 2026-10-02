<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

date_default_timezone_set('Asia/Calcutta');
include_once '../../config/database.php';
include_once '../../class/WhatsApp.php';

// Send a template with sample values — only to configured test numbers, so this
// endpoint can't be used to message arbitrary numbers.
$data     = json_decode(file_get_contents("php://input"), true);
$template = isset($data['template']) ? $data['template'] : '';
$mobile   = WhatsApp::normalizeMobile(isset($data['mobile']) ? $data['mobile'] : '');

$samples = [
    WhatsApp::TPL_WELCOME        => ['Test Member', 'Pro Gym, Kolhapur'],
    WhatsApp::TPL_PAYMENT        => ['Test Member', '2,000', '3 Months', date('d/m/Y'), 'Balance: Rs.1,000', 'Pro Gym, Kolhapur'],
    WhatsApp::TPL_REMINDER       => ['Test Member', 'Pro Gym, Kolhapur', '3 Months', '01/07/2026', date('d/m/Y'), 'Expires today', 'Fully paid'],
    WhatsApp::TPL_PROCOINS       => ['Test Member', '50', 'Test bonus'],
    WhatsApp::TPL_BIRTHDAY       => ['Test Member', '100'],
    WhatsApp::TPL_PHOTO_REMINDER => ['Test Member'],
    WhatsApp::TPL_APP_LAUNCH     => ['Test Member'],
];

if (!isset($samples[$template])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unknown template']);
    exit;
}

$cfg     = WhatsApp::config();
$testNos = !empty($cfg['test_numbers']) ? $cfg['test_numbers'] : (isset($cfg['allowed_numbers']) ? $cfg['allowed_numbers'] : []);
if ($mobile === null || !in_array($mobile, $testNos, true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Number is not in the WhatsApp test list']);
    exit;
}

$db = (new Database())->getConnection();
$ok = WhatsApp::sendTemplate($db, 'test', null, $mobile, $template, $samples[$template]);

$err = null;
if (!$ok) {
    $s = $db->prepare("SELECT errorMessage FROM whatsapp_log WHERE mobile = ? AND template = ? ORDER BY id DESC LIMIT 1");
    $s->execute([$mobile, $template]);
    $err = $s->fetchColumn() ?: 'Send failed (WhatsApp disabled or not configured)';
}
echo json_encode(['success' => $ok, 'error' => $err]);
