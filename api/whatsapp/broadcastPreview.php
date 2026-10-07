<?php
// Reach + cost estimate for a WhatsApp broadcast: GET ?audience=active&value=
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';
include_once '../../class/WhatsAppBroadcast.php';
include_once '../push/_audience.php';

date_default_timezone_set('Asia/Calcutta');

$filter = push_audience_filter(isset($_GET['audience']) ? $_GET['audience'] : '', isset($_GET['value']) ? $_GET['value'] : '');
if ($filter === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid audience']);
    exit;
}
list($where, $params) = $filter;

$db = (new Database())->getConnection();
list($recipients, $skipped) = WhatsAppBroadcast::recipients($db, $where, $params);

$pending = intval($db->query("SELECT COUNT(*) FROM whatsapp_queue WHERE status = 'pending'")->fetchColumn());
$cfg     = WhatsApp::config();

echo json_encode([
    'recipients'   => count($recipients),
    'skipped'      => $skipped,                       // no/invalid mobile or duplicate number
    'pricePerMsg'  => WhatsAppBroadcast::pricePerMessage(),
    'dailyCap'     => WhatsAppBroadcast::dailyCap(),
    'sentToday'    => WhatsAppBroadcast::sentToday($db),
    'pendingQueue' => $pending,                       // still waiting from earlier broadcasts
    'testMode'     => !empty($cfg['allowed_numbers']),
]);
