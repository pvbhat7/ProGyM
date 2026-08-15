<?php
/**
 * One-shot admin fix — for a single client + Bonanza match, overwrite the
 * stored prediction's exact score to match the actual match result, then
 * re-run settleAllForMatch() (idempotent) so the exact-score points get
 * awarded.
 *
 * Used to correct Prashant Bhat (mobile 8796238220) for M101 (SF1 FRA vs SPA).
 *
 * Usage (one-off, then delete this file from the server):
 *   curl "https://tavrostechinfo.com/PROGYM/ggs/api/wc_special/fixExactScoreForUser.php?key=wcCron_8Hk2Mq4Tn9pXr&mobile=8796238220&match_id=101"
 */

header("Content-Type: application/json; charset=UTF-8");

define('CRON_SECRET', 'wcCron_8Hk2Mq4Tn9pXr');
$key = isset($_GET['key']) ? $_GET['key'] : '';
if (!hash_equals(CRON_SECRET, $key)) {
    http_response_code(403);
    echo json_encode(["message" => "Forbidden."]);
    exit;
}

$mobile   = isset($_GET['mobile'])   ? trim($_GET['mobile'])       : '';
$match_id = isset($_GET['match_id']) ? (int)$_GET['match_id']      : 0;
if ($mobile === '' || $match_id <= 0) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "mobile and match_id required"]);
    exit;
}
if (!in_array($match_id, [101, 102, 103, 104], true)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "match_id not in Bonanza set"]);
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok" => false, "error" => "db"]); exit; }

// 1. Look up client by mobile
$c = $db->prepare("SELECT id, name, mobile FROM client WHERE mobile = :m LIMIT 1");
$c->bindValue(':m', $mobile);
$c->execute();
$client = $c->fetch(PDO::FETCH_ASSOC);
if (!$client) {
    http_response_code(404);
    echo json_encode(["ok" => false, "error" => "client not found for mobile $mobile"]);
    exit;
}
$client_id = (int)$client['id'];

// 2. Load actual match result
$m = $db->prepare("SELECT status, score_a, score_b FROM wc_matches WHERE id = :id");
$m->bindValue(':id', $match_id, PDO::PARAM_INT);
$m->execute();
$match = $m->fetch(PDO::FETCH_ASSOC);
if (!$match) {
    http_response_code(404);
    echo json_encode(["ok" => false, "error" => "match $match_id not found"]);
    exit;
}
if ($match['status'] !== 'settled') {
    http_response_code(409);
    echo json_encode(["ok" => false, "error" => "match $match_id not settled — cannot fix yet"]);
    exit;
}
$actualA = (int)$match['score_a'];
$actualB = (int)$match['score_b'];

// 3. Load the client's existing prediction row (for audit response)
$p = $db->prepare("SELECT id, pred_winner, pred_score_a, pred_score_b, pred_first_scorer_id, pred_motm_id,
                          points_winner, points_score, points_first_scorer, points_motm, points_total, settled_at
                   FROM wc_special_predictions
                   WHERE client_id = :cid AND match_id = :mid AND discontinue != 'true' LIMIT 1");
$p->bindValue(':cid', $client_id, PDO::PARAM_INT);
$p->bindValue(':mid', $match_id, PDO::PARAM_INT);
$p->execute();
$before = $p->fetch(PDO::FETCH_ASSOC);
if (!$before) {
    http_response_code(404);
    echo json_encode(["ok" => false, "error" => "no prediction row for client $client_id + match $match_id"]);
    exit;
}

// 4. Overwrite pred_score_a / pred_score_b to match the actual result
$u = $db->prepare("UPDATE wc_special_predictions
                      SET pred_score_a = :sa, pred_score_b = :sb, updated_at = NOW()
                    WHERE id = :id");
$u->bindValue(':sa', $actualA, PDO::PARAM_INT);
$u->bindValue(':sb', $actualB, PDO::PARAM_INT);
$u->bindValue(':id', (int)$before['id'], PDO::PARAM_INT);
$u->execute();

// 5. Re-run the (idempotent) settler for this match — regrades every prediction row
//    for match_id, including the one we just corrected. Awards exact-score pts.
$sp     = new WcSpecialPrediction($db);
$result = $sp->settleAllForMatch($match_id);

// 6. Reload the row post-fix for the response
$p->execute();
$after = $p->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "ok"              => true,
    "client_id"       => $client_id,
    "client_name"     => $client['name'],
    "client_mobile"   => $client['mobile'],
    "match_id"        => $match_id,
    "actual_score"    => "$actualA-$actualB",
    "prediction_before" => $before,
    "prediction_after"  => $after,
    "settle_result"     => $result,
], JSON_PRETTY_PRINT);
?>
