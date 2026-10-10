<?php
/**
 * Member view of their own AI diet plan (read-only — only admins generate/assign plans).
 *
 * GET ?clientId=<id>   Header: Authorization: Bearer <Firebase ID token of the logged-in member>
 * The token must belong to that client: verified phone = client.mobile, or Google uid = client.googleUid,
 * or verified Google email = client.email (same ways the member can log in).
 * → { plan: null | {id, title, created_at, plan, inputs} }   (inputs trimmed to display chips only)
 */
include_once __DIR__ . '/_common.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') diet_fail(405, 'GET only');

$h = '';
if (!empty($_SERVER['HTTP_AUTHORIZATION']))              $h = $_SERVER['HTTP_AUTHORIZATION'];
elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
elseif (function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) { $h = $v; break; }
}
try {
    $claims = FirebaseIdToken::verify(preg_match('/^\s*Bearer\s+(.+?)\s*$/i', (string)$h, $m) ? $m[1] : '');
} catch (Exception $e) {
    diet_fail(401, 'Please log out and log in again to see your diet plan.');
}

$clientId = isset($_GET['clientId']) ? (int)$_GET['clientId'] : 0;
if ($clientId <= 0) diet_fail(400, 'Missing member id.');

$db = (new Database())->getConnection();
$s = $db->prepare("SELECT id, mobile, email, googleUid FROM client WHERE id = ? AND COALESCE(discontinue,'') <> 'true'");
$s->execute(array($clientId));
$c = $s->fetch(PDO::FETCH_ASSOC);
if (!$c) diet_fail(404, 'Member not found.');

$phone  = substr(preg_replace('/\D/', '', (string)(isset($claims['phone_number']) ? $claims['phone_number'] : '')), -10);
$email  = strtolower(trim((string)(isset($claims['email']) ? $claims['email'] : '')));
$owns = ($phone !== '' && strlen($phone) === 10 && substr(preg_replace('/\D/', '', (string)$c['mobile']), -10) === $phone)
     || (!empty($c['googleUid']) && hash_equals((string)$c['googleUid'], (string)$claims['sub']))
     || ($email !== '' && !empty($claims['email_verified']) && strtolower(trim((string)$c['email'])) === $email);
if (!$owns) diet_fail(403, 'This diet plan belongs to another member.');

$p = $db->prepare("SELECT id, title, inputs, plan, created_at FROM ai_diet_plan WHERE client_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1");
$p->execute(array($clientId));
$row = $p->fetch(PDO::FETCH_ASSOC);
if (!$row) { echo json_encode(array('plan' => null)); exit; }

// Only what the plan header shows — medical notes etc. stay admin-side
$in = json_decode((string)$row['inputs'], true) ?: array();
$show = array();
foreach (array('goal', 'diet_type', 'weight_kg', 'meals', 'workout_time', 'supplements') as $k) if (isset($in[$k])) $show[$k] = $in[$k];

echo json_encode(array('plan' => array(
    'id' => (int)$row['id'], 'title' => $row['title'], 'created_at' => $row['created_at'],
    'plan' => json_decode((string)$row['plan'], true), 'inputs' => $show,
)), JSON_UNESCAPED_UNICODE);
