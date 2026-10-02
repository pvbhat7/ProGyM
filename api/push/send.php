<?php
/**
 * Admin broadcast: text or text+image notification to a member audience.
 *
 * POST body:
 * {
 *   "title":         "Diwali offer 🎉",            required, ≤ 80 chars
 *   "message":       "20% off on 6-month plans",   required, ≤ 250 chars
 *   "image":         "data:image/jpeg;base64,...",  optional
 *   "link":          "/member-packages",            optional — app path or https URL
 *   "audience":      "all|active|inactive|male|female|client",
 *   "audienceValue": "123",                         client id when audience=client
 *   "createdBy":     "admin name"
 * }
 *
 * Every targeted member gets an in-app inbox row (user_notifications, type
 * 'broadcast'); members who enabled notifications also get a browser push.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';
include_once '../../class/PushSender.php';
include_once './_audience.php';

set_time_limit(300);
ignore_user_abort(true);
date_default_timezone_set('Asia/Calcutta');

function fail($code, $msg) {
    http_response_code($code);
    echo json_encode(array("success" => false, "message" => $msg));
    exit;
}

function str_len($s) {
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

$data          = json_decode(file_get_contents("php://input"), true);
$title         = isset($data['title'])         ? trim($data['title'])         : '';
$message       = isset($data['message'])       ? trim($data['message'])       : '';
$imageB64      = isset($data['image'])         ? $data['image']               : '';
$link          = isset($data['link'])          ? trim($data['link'])          : '';
$audience      = isset($data['audience'])      ? $data['audience']            : '';
$audienceValue = isset($data['audienceValue']) ? (string)$data['audienceValue'] : '';
$createdBy     = isset($data['createdBy'])     ? substr(trim($data['createdBy']), 0, 50) : '';

if ($title === '' || $message === '')  fail(400, 'Title and message are required.');
if (str_len($title) > 80)              fail(400, 'Title must be 80 characters or less.');
if (str_len($message) > 250)           fail(400, 'Message must be 250 characters or less.');
if ($link !== '' && !preg_match('#^(/[^\s]*|https://[^\s]+)$#', $link)) {
    fail(400, 'Link must be an app path like /member-packages or an https:// URL.');
}
if (strlen($link) > 500) fail(400, 'Link is too long.');

$filter = push_audience_filter($audience, $audienceValue);
if ($filter === null) fail(400, 'Invalid audience.');
list($where, $params) = $filter;

// ---------- Optional image → uploads/push/ ----------
$imageUrl = null;
if ($imageB64 !== '') {
    $raw = base64_decode(preg_replace('#^data:image/\w+;base64,#', '', $imageB64), true);
    if ($raw === false || strlen($raw) === 0) fail(400, 'Invalid image data.');
    if (strlen($raw) > 2 * 1024 * 1024)       fail(400, 'Image must be under 2 MB.');

    $info = @getimagesizefromstring($raw);
    $extByMime = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp');
    if (!$info || !isset($extByMime[$info['mime']])) fail(400, 'Image must be JPEG, PNG or WebP.');

    $uploadDir = '../../uploads/push/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $filename = 'push_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extByMime[$info['mime']];
    if (file_put_contents($uploadDir . $filename, $raw) === false) fail(500, 'Failed to save image.');

    // Public URL: /PROGYM/ggs/api/push/send.php → /PROGYM/ggs/uploads/push/<file>
    $appRoot  = rtrim(dirname(dirname(dirname($_SERVER['SCRIPT_NAME']))), '/\\');
    $imageUrl = 'https://' . $_SERVER['HTTP_HOST'] . $appRoot . '/uploads/push/' . $filename;
}

$database = new Database();
$db = $database->getConnection();

$createdAt = date('d-m-Y H:i:s');
$linkOrNull = $link !== '' ? $link : null;

// ---------- 1. Broadcast history row ----------
$stmt = $db->prepare(
    "INSERT INTO push_broadcasts (title, message, image, link, audience, audience_value, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->execute(array($title, $message, $imageUrl, $linkOrNull, $audience, $audienceValue !== '' ? $audienceValue : null, $createdBy, date('Y-m-d H:i:s')));
$broadcastId = (int)$db->lastInsertId();

// ---------- 2. In-app inbox rows for every targeted member ----------
$stmt = $db->prepare(
    "INSERT INTO user_notifications (clientId, type, title, message, amount, isRead, createdAt, discontinue, image, link)
     SELECT c.id, 'broadcast', ?, ?, '', 'no', ?, 'false', ?, ?
     FROM client c WHERE $where"
);
$stmt->execute(array_merge(array($title, $message, $createdAt, $imageUrl, $linkOrNull), $params));
$recipients = $stmt->rowCount();

// ---------- 3. Browser push to their active devices ----------
$stmt = $db->prepare(
    "SELECT t.id, t.token, t.client_id FROM push_tokens t JOIN client c ON c.id = t.client_id
     WHERE t.is_active = 'yes' AND $where"
);
$stmt->execute($params);
$tokens = $stmt->fetchAll(PDO::FETCH_ASSOC);

// The service worker POSTs "delivered" / "clicked" receipts here.
$apiRoot    = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\');
$receiptUrl = 'https://' . $_SERVER['HTTP_HOST'] . $apiRoot . '/push/receipt.php';

$push = array('sent' => 0, 'failed' => 0, 'deactivated' => 0, 'results' => array());
$pushError = null;
if (!empty($tokens)) {
    try {
        $push = PushSender::sendToTokens($db, $tokens, array(
            'title' => $title,
            'body'  => $message,
            'image' => $imageUrl,
            'link'  => $linkOrNull,
            'nid'   => (string)$broadcastId,
            'rcpt'  => $receiptUrl,
        ));
    } catch (Exception $e) {
        $push['failed'] = count($tokens);
        $pushError = $e->getMessage();
    }

    // Per-device delivery log
    $log = $db->prepare(
        "INSERT INTO push_delivery_log (broadcast_id, token_id, client_id, status, error, sent_at)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $sentAt = date('Y-m-d H:i:s');
    foreach ($tokens as $t) {
        $r = isset($push['results'][$t['id']]) ? $push['results'][$t['id']] : array('ok' => false, 'error' => $pushError ? substr($pushError, 0, 250) : 'not sent');
        $log->execute(array($broadcastId, $t['id'], $t['client_id'], $r['ok'] ? 'sent' : 'failed', $r['error'], $sentAt));
    }
}

$stmt = $db->prepare("UPDATE push_broadcasts SET recipients = ?, devices = ?, push_sent = ?, push_failed = ? WHERE id = ?");
$stmt->execute(array($recipients, count($tokens), $push['sent'], $push['failed'], $broadcastId));

echo json_encode(array(
    "success"     => true,
    "id"          => $broadcastId,
    "recipients"  => $recipients,
    "devices"     => count($tokens),
    "pushSent"    => $push['sent'],
    "pushFailed"  => $push['failed'],
    "pushError"   => $pushError,
    "image"       => $imageUrl,
));
?>
