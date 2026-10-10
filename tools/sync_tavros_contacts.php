<?php
/**
 * One-time sync: push all members (name + mobile) to Tavros Connect contacts, so the
 * gateway's Chats show member names instead of bare numbers.
 *
 * CLI only:   /usr/bin/php tools/sync_tavros_contacts.php
 * Runs only when whatsapp.json api_base points at Tavros Connect.
 *
 * POST WhatsApp::apiUrl('contacts')  (= https://tavrosconnect.com/v23.0/contacts), 500 per request:
 *   {"contacts":[{"phone":"919876543210","name":"Rahul Patil","tags":["members"]}, ...]}
 * → {"success":true,"created":n,"updated":n,"invalid":n,"contacts":[{"phone","status"}]}
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

date_default_timezone_set('Asia/Calcutta');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../class/WhatsApp.php';

$cfg = WhatsApp::config();
if (empty($cfg['api_base']) || stripos($cfg['api_base'], 'tavrosconnect') === false) {
    fwrite(STDERR, "api_base is not Tavros Connect — nothing to do.\n");
    exit(1);
}
if (empty($cfg['access_token'])) {
    fwrite(STDERR, "access_token missing in whatsapp.json.\n");
    exit(1);
}

$db = (new Database())->getConnection();
$rows = $db->query("SELECT id, name, mobile FROM client ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

// One entry per phone — the same mobile can sit on several client rows; the newest row's name wins.
$byPhone = [];
$skipped = 0;
foreach ($rows as $r) {
    $phone = WhatsApp::normalizeMobile($r['mobile']);
    $name  = trim(preg_replace('/\s+/', ' ', (string)$r['name']));
    if ($phone === null || $name === '') { $skipped++; continue; }
    $byPhone[$phone] = ['phone' => $phone, 'name' => $name, 'tags' => ['members']];
}
$contacts = array_values($byPhone);
echo "Clients read: " . count($rows) . " | skipped (empty name / invalid mobile): $skipped"
   . " | duplicate phones merged: " . (count($rows) - $skipped - count($contacts))
   . " | to sync: " . count($contacts) . "\n";

$url = WhatsApp::apiUrl('contacts');
$tot = ['created' => 0, 'updated' => 0, 'invalid' => 0];
$failedChunks = 0;
foreach (array_chunk($contacts, 500) as $i => $chunk) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['contacts' => $chunk]),
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $cfg['access_token'], 'Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $raw  = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);

    $res = json_decode((string)$raw, true);
    $n = $i + 1;
    if ($http !== 200 || empty($res['success'])) {
        $failedChunks++;
        $err = $cerr ?: (isset($res['error']['message']) ? $res['error']['message'] : substr((string)$raw, 0, 300));
        echo "Chunk $n (" . count($chunk) . "): FAILED — HTTP $http — $err\n";
        continue;
    }
    foreach ($tot as $k => $_) $tot[$k] += intval(isset($res[$k]) ? $res[$k] : 0);
    printf("Chunk %d (%d): created %d, updated %d, invalid %d\n", $n, count($chunk),
        intval($res['created'] ?? 0), intval($res['updated'] ?? 0), intval($res['invalid'] ?? 0));
}

printf("TOTAL: created %d, updated %d, invalid %d%s\n", $tot['created'], $tot['updated'], $tot['invalid'],
    $failedChunks ? " | failed chunks: $failedChunks" : '');
exit($failedChunks ? 1 : 0);
