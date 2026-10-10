<?php
/**
 * Shared bootstrap for AI Diet Plan endpoints: CORS/JSON headers + admin check.
 * Admin = Firebase ID token (Authorization: Bearer …) whose verified phone is in admin_user
 * — same rule as api/ai/ask.php.
 */
if (basename($_SERVER['SCRIPT_FILENAME']) === '_common.php') { http_response_code(404); exit; }

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Cache-Control: no-store");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

date_default_timezone_set('Asia/Calcutta');
include_once __DIR__ . '/../../config/database.php';
include_once __DIR__ . '/../../class/FirebaseIdToken.php';
include_once __DIR__ . '/../../class/AiDietPlan.php';

function diet_fail($http, $msg) {
    http_response_code($http);
    echo json_encode(array('error' => $msg));
    exit;
}

function diet_json() {
    $in = json_decode(file_get_contents('php://input'), true);
    return is_array($in) ? $in : array();
}

/** @return array [PDO $db, string $adminMobile] */
function diet_admin() {
    $h = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))              $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    elseif (function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) { $h = $v; break; }
    }
    $token = preg_match('/^\s*Bearer\s+(.+?)\s*$/i', (string)$h, $m) ? $m[1] : '';
    try {
        $claims = FirebaseIdToken::verify($token);
    } catch (Exception $e) {
        diet_fail(401, 'Please log out and log in again (with OTP) to use AI Diet Plans.');
    }
    $mobile = substr(preg_replace('/\D/', '', (string)(isset($claims['phone_number']) ? $claims['phone_number'] : '')), -10);
    if (strlen($mobile) !== 10) diet_fail(403, 'AI Diet Plans are available to admins only.');

    $db = (new Database())->getConnection();
    $s = $db->prepare("SELECT id FROM admin_user WHERE RIGHT(mobile, 10) = ? LIMIT 1");
    $s->execute(array($mobile));
    if (!$s->fetchColumn()) diet_fail(403, 'AI Diet Plans are available to admins only.');
    return array($db, $mobile);
}
