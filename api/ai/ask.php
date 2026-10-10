<?php
/**
 * AI Search (Admin Dashboard).
 *
 * POST { question: "...", history: [{q, a}, ...] }
 * Header: Authorization: Bearer <Firebase ID token of the logged-in admin>
 *   → the token's verified phone number must belong to an admin_user, otherwise 401/403.
 *
 * → { answer, evidence: null | {label, columns, rows:[{id,name,...}], total}, used_today, cap }
 *
 * Read-only on business data; writes only its own ai_log row.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Cache-Control: no-store");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

date_default_timezone_set('Asia/Calcutta');
@set_time_limit(120);
include_once '../../config/database.php';
include_once '../../class/FirebaseIdToken.php';
include_once '../../class/AiAssistant.php';

function ai_fail($http, $msg) {
    http_response_code($http);
    echo json_encode(['error' => $msg]);
    exit;
}

function ai_bearer() {
    $h = '';
    if (!empty($_SERVER['HTTP_AUTHORIZATION']))              $h = $_SERVER['HTTP_AUTHORIZATION'];
    elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    elseif (function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) { $h = $v; break; }
    }
    return preg_match('/^\s*Bearer\s+(.+?)\s*$/i', (string)$h, $m) ? $m[1] : '';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') ai_fail(405, 'POST only');

$cfg = AiAssistant::config();
if (empty($cfg['enabled']) || empty($cfg['api_key'])) ai_fail(503, 'AI Search is not switched on yet.');

// ── Admin check: verified Firebase phone login → admin_user ──
try {
    $claims = FirebaseIdToken::verify(ai_bearer());
} catch (Exception $e) {
    ai_fail(401, 'Please log out and log in again to use AI Search.');
}
$phone = (string)(isset($claims['phone_number']) ? $claims['phone_number'] : '');
$mobile = substr(preg_replace('/\D/', '', $phone), -10);
if (strlen($mobile) !== 10) ai_fail(403, 'AI Search is available to admins only.');

$db = (new Database())->getConnection();
$s = $db->prepare("SELECT id FROM admin_user WHERE RIGHT(mobile, 10) = ? LIMIT 1");
$s->execute([$mobile]);
if (!$s->fetchColumn()) ai_fail(403, 'AI Search is available to admins only.');

// ── Input + daily cap ──
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$question = trim(preg_replace('/\s+/', ' ', (string)(isset($in['question']) ? $in['question'] : '')));
if (mb_strlen($question) < 2) ai_fail(400, 'Please type a question.');
if (mb_strlen($question) > 500) ai_fail(400, 'Please keep the question under 500 characters.');
$history = isset($in['history']) && is_array($in['history']) ? $in['history'] : [];

$cap = max(1, intval(isset($cfg['daily_question_cap']) ? $cfg['daily_question_cap'] : 300));
$used = (int)$db->query("SELECT COUNT(*) FROM ai_log WHERE created_at >= CURDATE() AND status = 'ok'")->fetchColumn();
if ($used >= $cap) ai_fail(429, "Today's AI Search limit ($cap questions) is used up. It resets at midnight.");

// ── Ask ──
$t0 = microtime(true);
$log = $db->prepare("INSERT INTO ai_log (admin_mobile, question, answer, tools, records, model, input_tokens, output_tokens, ms, status, error, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
try {
    $r = AiAssistant::ask($db, $question, $history);
    $ms = (int)round((microtime(true) - $t0) * 1000);
    $log->execute([$mobile, $question, $r['answer'], implode(',', $r['tools']), $r['evidence'] ? $r['evidence']['total'] : null,
                   $r['model'], $r['usage']['in'], $r['usage']['out'], $ms, 'ok', null]);
    echo json_encode([
        'answer'     => $r['answer'],
        'evidence'   => $r['evidence'],
        'used_today' => $used + 1,
        'cap'        => $cap,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $ms = (int)round((microtime(true) - $t0) * 1000);
    $log->execute([$mobile, $question, null, null, null, isset($cfg['model']) ? $cfg['model'] : null, null, null, $ms, 'error', mb_substr($e->getMessage(), 0, 500)]);
    ai_fail(502, $e->getMessage());
}
