<?php
/**
 * GET /api/license/history.php
 *
 * Proxies to the license server's /api/history.php so the gym's License
 * page can render its payment/subscription history without exposing the
 * license server's DB directly.
 *
 * Informational only — not part of enforcement.
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204); exit;
}

require_once __DIR__ . '/_verifier.php';

$cfgPath = __DIR__ . '/config.php';
if (!file_exists($cfgPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'config_missing']);
    exit;
}
$cfg = require $cfgPath;

// Derive history URL from check URL (same directory on license server).
$historyUrl = preg_replace('#/check\.php$#', '/history.php', $cfg['server_url']);
if ($historyUrl === $cfg['server_url']) {
    $historyUrl = rtrim($cfg['server_url'], '/') . '/history.php';
}

$body = json_encode(['client_code' => $cfg['client_code']]);

$ch = curl_init($historyUrl);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);
$raw    = curl_exec($ch);
$err    = curl_error($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false || $raw === '') {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => $err !== '' ? $err : 'no_response']);
    exit;
}
if ($status !== 200) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => "upstream_http_{$status}"]);
    exit;
}
$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'malformed_upstream']);
    exit;
}
echo json_encode($decoded);
