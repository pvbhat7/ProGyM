<?php
/**
 * Self sign-up from the login screen (strangers joining the app).
 *
 * POST {
 *   method: "mobile" | "google",
 *   phoneIdToken:  Firebase ID token from mobile OTP sign-in (required — proves the mobile),
 *   googleIdToken: Firebase ID token from Google sign-in (method=google),
 *   firstName, lastName,
 *   email: optional (method=mobile; method=google uses the Google email)
 * }
 * → { success, id, name, mobile }   |   { success:false, code, error }
 *
 * Creates an app user: isGymClient='no', profileActiveFlag='enable', creationSource='self_signup',
 * + 100 ProCoins welcome bonus. The mobile comes ONLY from the verified token, never the body.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

date_default_timezone_set('Asia/Calcutta');
include_once '../../config/database.php';
include_once '../../class/FirebaseIdToken.php';
include_once '../../config/mail_config.php';
include_once '../../class/AttendanceAlert.php';

function fail($http, $code, $msg) {
    http_response_code($http);
    echo json_encode(['success' => false, 'code' => $code, 'error' => $msg]);
    exit;
}

$data   = json_decode(file_get_contents("php://input"), true) ?: [];
$method = $data['method'] ?? '';
$first  = trim(preg_replace('/\s+/', ' ', (string)($data['firstName'] ?? '')));
$last   = trim(preg_replace('/\s+/', ' ', (string)($data['lastName'] ?? '')));
$email  = strtolower(trim((string)($data['email'] ?? '')));

if (!in_array($method, ['mobile', 'google'], true)) fail(400, 'bad_method', 'Invalid sign-up method');
$nameRe = "/^[\\p{L}][\\p{L} .'-]{0,59}$/u";
if (!preg_match($nameRe, $first)) fail(400, 'bad_first_name', 'Please enter a valid first name');
if (!preg_match($nameRe, $last))  fail(400, 'bad_last_name', 'Please enter a valid last name');

// Mobile — only from a verified phone-auth token
try {
    $phone = FirebaseIdToken::verify($data['phoneIdToken'] ?? '');
} catch (Exception $e) {
    fail(401, 'bad_phone_token', 'Mobile verification failed: ' . $e->getMessage());
}
$pn = (string)($phone['phone_number'] ?? '');
if (!preg_match('/^\+91([6-9]\d{9})$/', $pn, $m)) fail(400, 'bad_mobile', 'Please verify an Indian mobile number');
$mobile = $m[1];

$googleUid = null;
if ($method === 'google') {
    try {
        $g = FirebaseIdToken::verify($data['googleIdToken'] ?? '');
    } catch (Exception $e) {
        fail(401, 'bad_google_token', 'Google verification failed: ' . $e->getMessage());
    }
    if (($g['firebase']['sign_in_provider'] ?? '') !== 'google.com') fail(401, 'bad_google_token', 'Not a Google sign-in');
    $googleUid = (string)$g['sub'];
    $email = strtolower((string)($g['email'] ?? ''));
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail(400, 'bad_email', 'Please enter a valid email or leave it blank');

$db = (new Database())->getConnection();

$s = $db->prepare("SELECT id FROM client WHERE mobile = ? AND COALESCE(discontinue,'') <> 'true' LIMIT 1");
$s->execute([$mobile]);
if ($s->fetchColumn()) fail(409, 'mobile_exists', 'This mobile number is already registered. Please log in with mobile OTP.');

if ($googleUid) {
    $s = $db->prepare("SELECT id FROM client WHERE googleUid = ? AND COALESCE(discontinue,'') <> 'true' LIMIT 1");
    $s->execute([$googleUid]);
    if ($s->fetchColumn()) fail(409, 'google_exists', 'This Google account is already registered. Please log in with Google.');
}
if ($email !== '') {
    $s = $db->prepare("SELECT id FROM client WHERE LOWER(email) = ? AND COALESCE(discontinue,'') <> 'true' LIMIT 1");
    $s->execute([$email]);
    if ($s->fetchColumn()) fail(409, 'email_exists', 'This email is already registered with another member.');
}

$name = $first . ' ' . $last;
try {
    $db->beginTransaction();
    $ins = $db->prepare(
        "INSERT INTO client
         SET name=?, admissionDate=?, mobile=?, email=?, googleUid=?,
             gender='', birthDate='', address='', bloodGroup='', reference='',
             photo='', profileActiveFlag='enable', isGymClient='no',
             creationSource='self_signup', discontinue='false', referPoints='',
             remarks='', previousGym='', height=0, weight=0,
             adp='', awp='', isPTClient='no', occupation=''"
    );
    $ins->execute([$name, date('d/m/Y'), $mobile, $email, $googleUid]);
    $id = intval($db->lastInsertId());

    $dt = date('d M Y');
    $db->prepare("INSERT INTO rewards (title, amount, isRedeemed, redeemDate, clientId) VALUES ('You have won procoins','100','true',?,?)")
       ->execute([$dt, $id]);
    $db->prepare("INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId) VALUES ('4564pt','Signup Welcome Bonus','100','1',?,?)")
       ->execute([$dt, $id]);
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('createSelfSignup error: ' . $e->getMessage());
    fail(500, 'server_error', 'Could not create your account. Please try again.');
}

echo json_encode(['success' => true, 'id' => $id, 'name' => $name, 'mobile' => $mobile]);

// Admin alert (WhatsApp / push per Settings → Admin Alerts) — after the response so sign-up stays fast
WhatsApp::finishResponse();
AttendanceAlert::signup($db, $id, $method === 'google' ? 'Google' : 'Mobile OTP');
