<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Admin "Send via WhatsApp" buttons — sends an approved template to one member.
// POST { clientId, kind, txnId? }
//   kind: welcome | reminder | photo_reminder | app_launch | birthday | payment_receipt (needs txnId)

date_default_timezone_set('Asia/Calcutta');
include_once '../../config/database.php';
include_once '../../config/mail_config.php';
include_once '../../class/WhatsApp.php';

$data     = json_decode(file_get_contents("php://input"), true);
$clientId = isset($data['clientId']) ? intval($data['clientId']) : 0;
$kind     = isset($data['kind']) ? $data['kind'] : '';
$txnId    = isset($data['txnId']) ? intval($data['txnId']) : 0;

$db = (new Database())->getConnection();

function client_row($db, $id) {
    $s = $db->prepare("SELECT name, mobile FROM client WHERE id = ? LIMIT 1");
    $s->execute([$id]);
    return $s->fetch(PDO::FETCH_ASSOC);
}

$ok = false;
$client = null;
switch ($kind) {
    case 'payment_receipt':
        if ($txnId > 0) $ok = WhatsApp::paymentReceiptForTxn($db, $txnId);
        break;
    case 'reminder':
        $ok = WhatsApp::reminder($db, $clientId);
        break;
    case 'welcome':
    case 'photo_reminder':
    case 'app_launch':
    case 'birthday':
        $client = client_row($db, $clientId);
        if (!$client) break;
        $map = [
            'welcome'        => [WhatsApp::TPL_WELCOME,        [$client['name'], GYM_NAME . ', ' . GYM_CITY]],
            'photo_reminder' => [WhatsApp::TPL_PHOTO_REMINDER, [$client['name']]],
            'app_launch'     => [WhatsApp::TPL_APP_LAUNCH,     [$client['name']]],
            'birthday'       => [WhatsApp::TPL_BIRTHDAY,       [$client['name'], '25']],
        ];
        $ok = WhatsApp::sendTemplate($db, $kind, $clientId, $client['mobile'], $map[$kind][0], $map[$kind][1]);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Unknown message type']);
        exit;
}

$err = null;
if (!$ok) {
    $s = $db->prepare("SELECT errorMessage FROM whatsapp_log WHERE type = ? ORDER BY id DESC LIMIT 1");
    $s->execute([$kind === 'payment_receipt' ? 'payment' : $kind]);
    $last = $s->fetchColumn();
    $err = $last ?: 'Not sent — member may have no valid mobile number or no active package';
}
echo json_encode(['success' => $ok, 'error' => $err]);
