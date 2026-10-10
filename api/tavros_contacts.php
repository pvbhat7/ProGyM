<?php
/**
 * Member names for Tavros Connect (our WhatsApp gateway) — pulled by Tavros on demand + hourly,
 * so its Chats show member names instead of bare numbers.
 *
 * GET /api/tavros_contacts.php?since=<unix ts>
 * Auth: "Authorization: Bearer <contacts_sync_secret>" (secret lives in secure_keys/whatsapp.json;
 *       empty secret = endpoint disabled → 401).
 * → {"contacts":[{"phone":"919876543210","name":"Rahul Patil","tags":["members"]}, ...],"next_cursor":null}
 *
 * Read-only; returns phone + name only. The client table has no created/updated timestamp,
 * so "since" is accepted but ignored — every call returns everyone (~1,400 rows).
 */
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store");

include_once '../config/database.php';
include_once '../class/WhatsApp.php';

function tc_bearer_token() {
    $h = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))               $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION']))  $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    elseif (function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strcasecmp($k, 'Authorization') === 0) { $h = $v; break; }
        }
    }
    return preg_match('/^\s*Bearer\s+(.+?)\s*$/i', (string)$h, $m) ? $m[1] : '';
}

$cfg    = WhatsApp::config();
$secret = isset($cfg['contacts_sync_secret']) ? trim((string)$cfg['contacts_sync_secret']) : '';
$token  = tc_bearer_token();
if ($secret === '' || $token === '' || !hash_equals($secret, $token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db   = (new Database())->getConnection();
$rows = $db->query("SELECT id, name, mobile FROM client ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

// One entry per normalised mobile — newest client row wins on duplicates
$byPhone = [];
foreach ($rows as $r) {
    $phone = WhatsApp::normalizeMobile($r['mobile']);
    $name  = trim(preg_replace('/\s+/', ' ', (string)$r['name']));
    if ($phone === null || $name === '') continue;
    $byPhone[$phone] = ['phone' => $phone, 'name' => $name, 'tags' => ['members']];
}

echo json_encode(['contacts' => array_values($byPhone), 'next_cursor' => null], JSON_UNESCAPED_UNICODE);
