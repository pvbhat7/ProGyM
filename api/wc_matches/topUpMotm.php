<?php
/**
 * Admin endpoint — pay out the deferred MOTM bonus on a match that was
 * auto-settled by cron (result_source = 'espn_partial').
 *
 * For every prediction on this match where the user named the correct MOTM,
 * adds (8 * stage_multiplier) footballs to:
 *   - wc_predictions.coins_awarded
 *   - wc_participants.total_coins_earned
 *
 * Then flips wc_matches.result_source -> 'complete' so the match disappears
 * from the admin "MOTM pending" queue and can never be topped up again.
 *
 * Request body (POST JSON):
 *   { "id": 12, "motm_id": 456 }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../class/WcScoringHelper.php';
include_once '../../class/WcParticipant.php';

$database = new Database();
$db = $database->getConnection();
if (!$db) {
    http_response_code(500);
    echo json_encode(array("message" => "DB connection failed."));
    exit;
}

$data    = json_decode(file_get_contents("php://input"));
$id      = isset($data->id)      ? (int)$data->id      : 0;
$motm_id = isset($data->motm_id) ? (int)$data->motm_id : 0;

if ($id <= 0 || $motm_id <= 0) {
    http_response_code(400);
    echo json_encode(array("message" => "id and motm_id are required."));
    exit;
}

// Idempotency: only allow top-up when match is in espn_partial state.
$check = $db->prepare("SELECT result_source FROM wc_matches WHERE id = :id");
$check->bindValue(':id', $id, PDO::PARAM_INT);
$check->execute();
$row = $check->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    http_response_code(404);
    echo json_encode(array("message" => "Match not found."));
    exit;
}
if ($row['result_source'] !== 'espn_partial') {
    http_response_code(409);
    echo json_encode(array(
        "message"       => "MOTM top-up not available — match result_source is '{$row['result_source']}'.",
        "result_source" => $row['result_source'],
    ));
    exit;
}

try {
    $db->beginTransaction();
    $result = WcScoringHelper::topUpMotmForMatch($db, $id, $motm_id);
    $db->commit();

    // Re-snapshot the leaderboard for the match's original settled date so the
    // updated totals propagate into tie-breaker rank_sum / top3_days.
    try {
        $ds = $db->prepare("SELECT DATE(settled_at) AS d FROM wc_matches WHERE id = :id");
        $ds->bindValue(':id', $id, PDO::PARAM_INT);
        $ds->execute();
        $dRow = $ds->fetch(PDO::FETCH_ASSOC);
        if ($dRow && !empty($dRow['d'])) {
            $participant = new WcParticipant($db);
            $participant->snapshotDailyLeaderboard($dRow['d']);
        }
    } catch (Exception $eSnap) { /* recoverable via backfill */ }

    echo json_encode(array_merge(
        array("message" => "MOTM bonus awarded."),
        $result,
        array("result_source" => 'complete')
    ));
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(array("message" => "Top-up failed: " . $e->getMessage()));
}
?>
