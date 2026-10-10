<?php
/**
 * POST { clientId, inputs: {gender, age, height_cm, weight_kg, goal, diet_type, activity, budget,
 *        meals, wake_time, workout_time, sleep_time, supplements, avoid, medical, notes} }
 * → { plan: {title, summary, targets, meals[], tips[]}, inputs, model }
 * Draft only — nothing is saved until save.php. Counts toward the daily AI cap (ai_log).
 */
include_once __DIR__ . '/_common.php';
@set_time_limit(120);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') diet_fail(405, 'POST only');
list($db, $mobile) = diet_admin();

$cfg = AiAssistant::config();
if (empty($cfg['enabled']) || empty($cfg['api_key'])) diet_fail(503, 'AI is not switched on yet.');

$in = diet_json();
$clientId = isset($in['clientId']) ? (int)$in['clientId'] : 0;
if ($clientId <= 0 || !AiDietPlan::member($db, $clientId)) diet_fail(404, 'Member not found.');
try {
    $inputs = AiDietPlan::cleanInputs(isset($in['inputs']) && is_array($in['inputs']) ? $in['inputs'] : array());
} catch (Exception $e) {
    diet_fail(400, $e->getMessage());
}

$cap = max(1, intval(isset($cfg['daily_question_cap']) ? $cfg['daily_question_cap'] : 300));
$used = (int)$db->query("SELECT COUNT(*) FROM ai_log WHERE created_at >= CURDATE() AND status = 'ok'")->fetchColumn();
if ($used >= $cap) diet_fail(429, "Today's AI limit ($cap requests) is used up. It resets at midnight.");

$t0 = microtime(true);
$question = "[diet] member #$clientId · {$inputs['goal']} · {$inputs['diet_type']} · {$inputs['meals']} meals";
$log = $db->prepare("INSERT INTO ai_log (admin_mobile, question, answer, tools, records, model, input_tokens, output_tokens, ms, status, error, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
try {
    $r = AiDietPlan::generate($inputs);
    $ms = (int)round((microtime(true) - $t0) * 1000);
    $log->execute(array($mobile, $question, $r['plan']['title'], 'diet_plan', count($r['plan']['meals']),
                        $r['model'], $r['usage']['in'], $r['usage']['out'], $ms, 'ok', null));
    echo json_encode(array('plan' => $r['plan'], 'inputs' => $inputs, 'model' => $r['model']), JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    $ms = (int)round((microtime(true) - $t0) * 1000);
    $log->execute(array($mobile, $question, null, 'diet_plan', null, isset($cfg['model']) ? $cfg['model'] : null, null, null, $ms, 'error', mb_substr($e->getMessage(), 0, 500)));
    diet_fail(502, $e->getMessage());
}
