<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

$path = __DIR__ . '/../../config/feature_flags.json';

if (!file_exists($path)) {
    echo json_encode(['showProCoinsPanel' => true]);
    exit;
}

$raw = file_get_contents($path);
$flags = json_decode($raw, true);
if (!is_array($flags)) {
    echo json_encode(['showProCoinsPanel' => true]);
    exit;
}

echo json_encode($flags);
?>
