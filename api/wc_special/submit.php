<?php
// Submit or update a Knockout Bonanza prediction for one of the 4 matches.
// POST /api/wc_special/submit.php  JSON body:
//   { client_id, match_id, pred_winner: 'A'|'B', score_a, score_b,
//     first_scorer_id (null only if 0-0), motm_id }

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid JSON body']);
    exit;
}

$client_id        = isset($body['client_id'])        ? (int)$body['client_id']        : 0;
$match_id         = isset($body['match_id'])         ? (int)$body['match_id']         : 0;
$pred_winner      = isset($body['pred_winner'])      ? strtoupper(trim($body['pred_winner'])) : '';
$score_a          = isset($body['score_a'])          ? (int)$body['score_a']          : -1;
$score_b          = isset($body['score_b'])          ? (int)$body['score_b']          : -1;
$first_scorer_id  = isset($body['first_scorer_id']) && $body['first_scorer_id'] ? (int)$body['first_scorer_id'] : null;
$motm_id          = isset($body['motm_id'])          ? (int)$body['motm_id']          : 0;

if ($client_id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'client_id required']); exit; }
if ($match_id  <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'match_id required']); exit; }
if ($score_a < 0 || $score_b < 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'score must be >= 0']); exit; }
if ($motm_id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'motm_id required']); exit; }

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }

$sp = new WcSpecialPrediction($db);
$res = $sp->upsertPrediction($client_id, $match_id, $pred_winner, $score_a, $score_b, $first_scorer_id, $motm_id);
if (!$res['ok']) {
    http_response_code(400);
    echo json_encode($res);
    exit;
}
echo json_encode(['ok' => true]);
?>
