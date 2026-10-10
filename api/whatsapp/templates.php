<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../class/WhatsApp.php';

// Live approval status of our templates from Meta (name, status, category, rejection reason)
$cfg = WhatsApp::config();
if (empty($cfg['access_token']) || empty($cfg['waba_id'])) {
    http_response_code(500);
    echo json_encode(['error' => 'WhatsApp not configured']);
    exit;
}

$ch = curl_init(WhatsApp::apiUrl($cfg['waba_id'] . '/message_templates?fields=name,status,category,language,rejected_reason,components&limit=100'));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $cfg['access_token']],
    CURLOPT_TIMEOUT        => 15,
]);
$res = json_decode((string)curl_exec($ch), true);
curl_close($ch);

if (isset($res['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $res['error']['message']]);
    exit;
}

$out = [];
foreach (isset($res['data']) ? $res['data'] : [] as $t) {
    if (strpos($t['name'], 'progym_') !== 0) continue;
    $body = '';
    foreach (isset($t['components']) ? $t['components'] : [] as $c) {
        if ($c['type'] === 'BODY') $body = $c['text'];
    }
    $out[] = [
        'name'           => $t['name'],
        'status'         => $t['status'],
        'category'       => $t['category'],
        'language'       => $t['language'],
        'rejectedReason' => isset($t['rejected_reason']) && $t['rejected_reason'] !== 'NONE' ? $t['rejected_reason'] : null,
        'body'           => $body,
    ];
}
usort($out, function ($a, $b) { return strcmp($a['name'], $b['name']); });

echo json_encode([
    'templates'      => $out,
    'enabled'        => !empty($cfg['enabled']),
    'allowedNumbers' => isset($cfg['allowed_numbers']) ? $cfg['allowed_numbers'] : [],
    'testNumbers'    => !empty($cfg['test_numbers']) ? $cfg['test_numbers'] : (isset($cfg['allowed_numbers']) ? $cfg['allowed_numbers'] : []),
]);
