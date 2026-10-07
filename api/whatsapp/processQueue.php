<?php
/**
 * Cron — sends the next batch of queued WhatsApp broadcast messages.
 *
 * Trigger (Hostinger cron, every 10 minutes):
 *   curl -s "https://tavrostechinfo.com/PROGYM/ggs/api/whatsapp/processQueue.php?key=<cron_key from whatsapp.json>"
 *
 * Stops for the day once `broadcast_daily_cap` is reached; continues the next day.
 */
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';
include_once '../../class/WhatsAppBroadcast.php';

set_time_limit(280);
date_default_timezone_set('Asia/Calcutta');

$cfg = WhatsApp::config();
$key = isset($_GET['key']) ? $_GET['key'] : '';
if (empty($cfg['cron_key']) || !hash_equals($cfg['cron_key'], $key)) {
    http_response_code(403);
    echo json_encode(['message' => 'Forbidden.']);
    exit;
}

$db = (new Database())->getConnection();
echo json_encode(WhatsAppBroadcast::process($db, 60));
