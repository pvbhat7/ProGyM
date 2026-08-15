<?php
/**
 * Admin-only — record the friend name a caller login was shared with.
 * Used so admin remembers who test1, test2, ... were given out to.
 *
 * POST /api/wc_calls/setSharedWith.php
 * Body JSON: { username, password, target_username, shared_with }
 *   - username/password = admin credentials
 *   - target_username   = the caller (e.g. "test3") whose label to update
 *   - shared_with       = friend name (max 100 chars, '' clears the field)
 * → { ok }
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Short-circuit CORS preflight so cross-origin POSTs from progym.co.in succeed.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once '../../config/database.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok"=>false,"message"=>"DB"]); exit; }

$data            = json_decode(file_get_contents("php://input"));
$username        = isset($data->username)        ? trim($data->username)        : '';
$password        = isset($data->password)        ? trim($data->password)        : '';
$target_username = isset($data->target_username) ? trim($data->target_username) : '';
$shared_with     = isset($data->shared_with)     ? trim($data->shared_with)     : '';

if ($username === '' || $password === '' || $target_username === '') {
    http_response_code(400);
    echo json_encode(["ok"=>false,"message"=>"Bad input"]);
    exit;
}

$stmt = $db->prepare("SELECT role FROM wc_call_users WHERE username = :u AND password = :p LIMIT 1");
$stmt->execute([':u'=>$username, ':p'=>$password]);
$me = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$me || $me['role'] !== 'admin') {
    http_response_code(401);
    echo json_encode(["ok"=>false,"message"=>"Admin only"]);
    exit;
}

$shared_with = mb_substr($shared_with, 0, 100);

$upd = $db->prepare("UPDATE wc_call_users SET shared_with = :sw WHERE username = :tu AND role = 'caller'");
$upd->execute([':sw'=>($shared_with === '' ? null : $shared_with), ':tu'=>$target_username]);

echo json_encode(["ok"=>true]);
?>
