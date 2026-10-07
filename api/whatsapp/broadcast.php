<?php
/**
 * Queue an admin WhatsApp broadcast and send the first batch.
 *
 * POST {
 *   "title": "Diwali offer",            optional — shown bold before the message
 *   "message": "...",                   required, ≤ 900 chars (line breaks are flattened by WhatsApp)
 *   "imageUrl": "https://...",          optional — already-uploaded image (e.g. from push/send.php)
 *   "image": "data:image/jpeg;base64,", optional — uploaded here when imageUrl isn't given
 *   "audience": "all|active|inactive|male|female|client", "audienceValue": "123",
 *   "createdBy": "admin", "pushBroadcastId": 12   optional — links to the push broadcast sent together
 * }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';
include_once '../../class/WhatsAppBroadcast.php';
include_once '../push/_audience.php';

set_time_limit(300);
ignore_user_abort(true);
date_default_timezone_set('Asia/Calcutta');

function fail($code, $msg) {
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $msg]);
    exit;
}

$data          = json_decode(file_get_contents("php://input"), true);
$title         = isset($data['title'])         ? trim($data['title'])           : '';
$message       = isset($data['message'])       ? trim($data['message'])         : '';
$imageUrl      = isset($data['imageUrl'])      ? trim($data['imageUrl'])        : '';
$imageB64      = isset($data['image'])         ? $data['image']                 : '';
$audience      = isset($data['audience'])      ? $data['audience']              : '';
$audienceValue = isset($data['audienceValue']) ? (string)$data['audienceValue'] : '';
$createdBy     = isset($data['createdBy'])     ? substr(trim($data['createdBy']), 0, 50) : '';
$pushId        = isset($data['pushBroadcastId']) ? intval($data['pushBroadcastId']) : 0;

if ($message === '')                     fail(400, 'Message is required.');
if (mb_strlen($message, 'UTF-8') > 900)  fail(400, 'WhatsApp message must be 900 characters or less.');
if (mb_strlen($title, 'UTF-8') > 80)     fail(400, 'Title must be 80 characters or less.');
if ($imageUrl !== '' && !preg_match('#^https://[^\s]+$#', $imageUrl)) fail(400, 'Invalid image URL.');

$filter = push_audience_filter($audience, $audienceValue);
if ($filter === null) fail(400, 'Invalid audience.');
list($where, $params) = $filter;

// WhatsApp-only broadcasts upload their image here (same folder push uses)
if ($imageUrl === '' && $imageB64 !== '') {
    $raw = base64_decode(preg_replace('#^data:image/\w+;base64,#', '', $imageB64), true);
    if ($raw === false || strlen($raw) === 0) fail(400, 'Invalid image data.');
    if (strlen($raw) > 2 * 1024 * 1024)       fail(400, 'Image must be under 2 MB.');
    $info = @getimagesizefromstring($raw);
    $extByMime = ['image/jpeg' => 'jpg', 'image/png' => 'png'];   // WhatsApp image headers: JPEG/PNG only
    if (!$info || !isset($extByMime[$info['mime']])) fail(400, 'WhatsApp image must be JPEG or PNG.');

    $uploadDir = '../../uploads/push/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $filename = 'wa_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extByMime[$info['mime']];
    if (file_put_contents($uploadDir . $filename, $raw) === false) fail(500, 'Failed to save image.');

    $appRoot  = rtrim(dirname(dirname(dirname($_SERVER['SCRIPT_NAME']))), '/\\');
    $imageUrl = 'https://' . $_SERVER['HTTP_HOST'] . $appRoot . '/uploads/push/' . $filename;
}

$db = (new Database())->getConnection();
$id = WhatsAppBroadcast::create($db, $title, $message, $imageUrl ?: null, $audience, $audienceValue, $createdBy, $pushId, $where, $params);

$s = $db->prepare("SELECT total, skipped FROM whatsapp_broadcasts WHERE id = ?");
$s->execute([$id]);
$b = $s->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "success"  => true,
    "id"       => $id,
    "queued"   => intval($b['total']),
    "skipped"  => intval($b['skipped']),
    "dailyCap" => WhatsAppBroadcast::dailyCap(),
    "sentToday"=> WhatsAppBroadcast::sentToday($db),
]);

// Send the first batch after the response; cron continues the rest
WhatsApp::finishResponse();
WhatsAppBroadcast::process($db, 60);
