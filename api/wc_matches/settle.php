<?php
/**
 * Admin endpoint — settle a match and award footballs to every user who predicted it.
 *
 * Scoring (per prediction, BEFORE stage multiplier):
 *   Match winner correct          : +5
 *   Both-teams-to-score correct   : +2
 *   Total goals range correct     : +4
 *   First goal scorer correct     : +8
 *   Man of the Match correct      : +5
 *   Exact final score correct     : +8
 *
 * Stage multiplier (already on wc_matches.multiplier): 1, 1.5, 2, 3, 5
 *
 * Footballs awarded are stored ONLY in wc_predictions.coins_awarded and
 * accumulated in wc_participants.total_coins_earned. They are NOT written to
 * the gym rewards / procointransaction tables — football → gym discount
 * conversion will be decided after the final match.
 *
 * On success: wc_matches.result_source is set to 'complete' (admin path).
 * The cron auto-settler uses the same engine but sets 'espn_partial'.
 *
 * Request body (POST JSON):
 *   {
 *     "id": 12,
 *     "winner": "A" | "B" | "DRAW",
 *     "score_a": 2,
 *     "score_b": 1,
 *     "first_scorer_id": 123,   // optional
 *     "motm_id": 456            // optional
 *   }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../class/WcScoringHelper.php';
include_once '../../class/WcFcmSender.php';
include_once '../../class/WcParticipant.php';
include_once '../../class/WcSpecialPrediction.php';

// ----- INPUT -----
$database = new Database();
$db = $database->getConnection();
if (!$db) {
    http_response_code(500);
    echo json_encode(array("message" => "DB connection failed."));
    exit;
}

$data = json_decode(file_get_contents("php://input"));

$id              = isset($data->id)              ? (int)$data->id              : 0;
$winner          = isset($data->winner)          ? strtoupper(trim($data->winner)) : '';
$score_a         = isset($data->score_a)         ? (int)$data->score_a         : -1;
$score_b         = isset($data->score_b)         ? (int)$data->score_b         : -1;
$first_scorer_id = isset($data->first_scorer_id) && $data->first_scorer_id ? (int)$data->first_scorer_id : null;
$motm_id         = isset($data->motm_id)         && $data->motm_id         ? (int)$data->motm_id         : null;

// ----- VALIDATE -----
if ($id <= 0){
    http_response_code(400);
    echo json_encode(array("message" => "id is required."));
    exit;
}
if (!in_array($winner, array('A','B','DRAW'), true)){
    http_response_code(400);
    echo json_encode(array("message" => "winner must be A, B or DRAW."));
    exit;
}
if ($score_a < 0 || $score_b < 0){
    http_response_code(400);
    echo json_encode(array("message" => "score_a and score_b are required (non-negative ints)."));
    exit;
}
if (($score_a >  $score_b && $winner !== 'A')    ||
    ($score_a <  $score_b && $winner !== 'B')    ||
    ($score_a === $score_b && $winner !== 'DRAW')){
    http_response_code(400);
    echo json_encode(array("message" => "winner does not match scores."));
    exit;
}

// ----- SETTLE inside transaction -----
try {
    $db->beginTransaction();

    $result = WcScoringHelper::settleMatchPredictions(
        $db, $id, $winner, $score_a, $score_b, $first_scorer_id, $motm_id
    );

    // Admin path is always 'complete' — admin had the chance to enter MOTM.
    $upd = $db->prepare("UPDATE wc_matches SET result_source = 'complete' WHERE id = :id");
    $upd->bindParam(':id', $id, PDO::PARAM_INT);
    $upd->execute();

    $db->commit();

    // Knockout Bonanza side-grade: if this match is one of M101-M104, grade
    // all special predictions for it. Runs AFTER commit + in its own try so
    // a special-side failure can never roll back the regular settlement.
    try {
        if (in_array((int)$id, [101, 102, 103, 104], true)) {
            $special = new WcSpecialPrediction($db);
            $special->settleAllForMatch((int)$id);
        }
    } catch (Exception $eSp) { /* never let special-settle abort the response */ }

    // Snapshot end-of-day leaderboard for the match's settled date.
    // Multiple matches on the same day all overwrite the same (client_id, date)
    // row, so the final call of the day reflects true end-of-day standings.
    // Runs AFTER commit and swallows errors — leaderboard rebuild can backfill if needed.
    try {
        $dateStmt = $db->prepare("SELECT DATE(settled_at) AS d FROM wc_matches WHERE id = :id");
        $dateStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $dateStmt->execute();
        $dateRow = $dateStmt->fetch(PDO::FETCH_ASSOC);
        if ($dateRow && !empty($dateRow['d'])){
            $participant = new WcParticipant($db);
            $participant->snapshotDailyLeaderboard($dateRow['d']);
        }
    } catch (Exception $eSnap) { /* never let snapshot failure abort the response */ }

    // Push: predictor + broadcast notifications. Runs AFTER commit so a
    // push failure can never roll back the settlement.
    try {
        WcFcmSender::notifyMatchSettled(
            $db, $id,
            $result['team_a_name'], $result['team_b_name'],
            $winner, $score_a, $score_b,
            $result['per_user']
        );
    } catch (Exception $eNotif) { /* never let push failure abort the response */ }

    echo json_encode(array(
        "message"             => "Match settled.",
        "match_id"            => $id,
        "match"               => $result['match_label'],
        "winner"              => $winner,
        "score"               => "{$score_a}-{$score_b}",
        "multiplier"          => $result['multiplier'],
        "predictions_settled" => $result['predictions_settled'],
        "users_awarded"       => $result['users_awarded'],
        "coins_distributed"   => $result['coins_distributed'],
        "per_user"            => $result['per_user'],
        "result_source"       => 'complete',
    ));
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    $code = ($e->getMessage() === 'Match already settled.') ? 409
          : ($e->getMessage() === 'Match not found.'        ? 404 : 500);
    http_response_code($code);
    echo json_encode(array("message" => "Settle failed: " . $e->getMessage()));
}
?>
