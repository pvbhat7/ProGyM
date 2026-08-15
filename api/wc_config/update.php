<?php
/**
 * Admin-only — update the bonanza-gating threshold (minFootballPoints) in
 * ./config.json (co-located with this endpoint). Admin auth reuses wc_call_users.
 *
 * POST /api/wc_config/update.php  JSON body:
 *   { username, password, minFootballPoints }
 * → { ok: true, config: { menuGate: { minFootballPoints } } }
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");

function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    include_once '../../config/database.php';

    $body = json_decode(file_get_contents("php://input"), true);
    if (!is_array($body)) respond(400, ['ok'=>false,'message'=>'invalid JSON body']);

    $username = isset($body['username']) ? trim($body['username']) : '';
    $password = isset($body['password']) ? trim($body['password']) : '';
    $minPts   = isset($body['minFootballPoints']) ? (int)$body['minFootballPoints'] : -1;

    if ($minPts < 0 || $minPts > 100000) {
        respond(400, ['ok'=>false,'message'=>'minFootballPoints must be 0..100000']);
    }

    $db = (new Database())->getConnection();
    if (!$db) respond(500, ['ok'=>false,'message'=>'DB connection failed']);

    $stmt = $db->prepare("SELECT role FROM wc_call_users WHERE username = :u AND password = :p LIMIT 1");
    $stmt->execute([':u'=>$username, ':p'=>$password]);
    $me = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$me || $me['role'] !== 'admin') respond(401, ['ok'=>false,'message'=>'Admin only']);

    // config.json lives right next to this endpoint so PHP always has write access
    // regardless of which Hostinger site hosts the wc2026 frontend.
    $configPath = __DIR__ . '/config.json';
    $configDir  = __DIR__;

    $existing = [];
    if (is_file($configPath)) {
        $rawFile = @file_get_contents($configPath);
        if ($rawFile !== false) {
            $parsed = json_decode($rawFile, true);
            if (is_array($parsed)) $existing = $parsed;
        }
    }
    if (!isset($existing['menuGate']) || !is_array($existing['menuGate'])) {
        $existing['menuGate'] = [];
    }
    $existing['menuGate']['minFootballPoints'] = $minPts;

    $canWrite = is_file($configPath) ? is_writable($configPath) : is_writable($configDir);
    if (!$canWrite) {
        respond(500, [
            'ok'=>false,
            'message'=>'PHP cannot write config.json — set permissions to 666 on api/wc_config/config.json (or 777 on the folder)',
            'debug'=>[
                'file_exists'   => is_file($configPath),
                'file_writable' => is_file($configPath) ? is_writable($configPath) : null,
                'dir_writable'  => is_writable($configDir),
                'path'          => $configPath,
            ],
        ]);
    }

    $json = json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    $written = @file_put_contents($configPath, $json, LOCK_EX);
    if ($written === false) {
        $err = error_get_last();
        respond(500, [
            'ok'=>false,
            'message'=>'Write failed: ' . ($err['message'] ?? 'unknown error'),
            'debug'=>['path'=>$configPath],
        ]);
    }

    respond(200, ['ok' => true, 'config' => $existing]);

} catch (Throwable $e) {
    respond(500, [
        'ok' => false,
        'message' => 'Server error: ' . $e->getMessage(),
        'debug' => ['file' => $e->getFile(), 'line' => $e->getLine()],
    ]);
}
?>
