<?php
/**
 * Public — returns the bonanza gate config (co-located config.json) with
 * CORS headers so the wc2026 frontend on progym.co.in can read it.
 *
 * GET /api/wc_config/get.php
 * → { menuGate: { minFootballPoints: N } }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Cache-Control: no-store, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configPath = __DIR__ . '/config.json';
$default = ['menuGate' => ['minFootballPoints' => 0]];

if (!is_file($configPath)) {
    echo json_encode($default);
    exit;
}

$raw = @file_get_contents($configPath);
$parsed = $raw !== false ? json_decode($raw, true) : null;
if (!is_array($parsed)) {
    echo json_encode($default);
    exit;
}

echo json_encode($parsed);
?>
