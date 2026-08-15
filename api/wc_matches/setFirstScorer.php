<?php
/**
 * Admin endpoint — set the First Scorer on a settled Bonanza match (M101-M104)
 * and re-grade every wc_special_predictions row for that match.
 *
 * The regular football side awards 0 for first scorer (WC_COIN_FIRST_SCORER = 0),
 * so this endpoint only affects Bonanza scoring (25 pts per correct guess).
 *
 * Idempotent — settleAllForMatch() overwrites the four point columns from the
 * current wc_matches row, so re-running produces identical results. If MOTM was
 * already topped up, its bonanza points are preserved because motm_id is read
 * back from wc_matches inside settleAllForMatch.
 *
 * Request body (POST JSON):
 *   { "id": 101, "first_scorer_id": 456 }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$db = (new Database())->getConnection();
if (!$db) {
    http_response_code(500);
    echo json_encode(["message" => "DB connection failed."]);
    exit;
}

$data            = json_decode(file_get_contents("php://input"));
$id              = isset($data->id)              ? (int)$data->id              : 0;
$first_scorer_id = isset($data->first_scorer_id) ? (int)$data->first_scorer_id : 0;

if ($id <= 0 || $first_scorer_id <= 0) {
    http_response_code(400);
    echo json_encode(["message" => "id and first_scorer_id are required."]);
    exit;
}
if (!in_array($id, [101, 102, 103, 104], true)) {
    http_response_code(400);
    echo json_encode(["message" => "First-scorer settlement is only supported for Bonanza matches (M101-M104)."]);
    exit;
}

// Match must be already settled — first scorer is a post-match datum.
$check = $db->prepare("SELECT status, score_a, score_b, first_scorer_id FROM wc_matches WHERE id = :id");
$check->bindValue(':id', $id, PDO::PARAM_INT);
$check->execute();
$row = $check->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    http_response_code(404);
    echo json_encode(["message" => "Match not found."]);
    exit;
}
if ($row['status'] !== 'settled') {
    http_response_code(409);
    echo json_encode(["message" => "Match not settled yet — cannot set first scorer."]);
    exit;
}
if ((int)$row['score_a'] + (int)$row['score_b'] === 0) {
    http_response_code(409);
    echo json_encode(["message" => "Match ended 0-0 — no goal was scored."]);
    exit;
}

try {
    $db->beginTransaction();
    $upd = $db->prepare("UPDATE wc_matches SET first_scorer_id = :fs WHERE id = :id");
    $upd->bindValue(':fs', $first_scorer_id, PDO::PARAM_INT);
    $upd->bindValue(':id', $id,              PDO::PARAM_INT);
    $upd->execute();
    $db->commit();

    // Re-grade all bonanza predictions for this match. settleAllForMatch reads
    // motm_id + first_scorer_id back from wc_matches, so MOTM points already
    // credited are preserved and first-scorer points get added on top.
    $result = ['ok' => true, 'graded' => 0];
    try {
        $sp = new WcSpecialPrediction($db);
        $result = $sp->settleAllForMatch($id);
    } catch (Exception $eSp) {
        // Never let bonanza-grade failure roll back the wc_matches update;
        // it can be re-triggered by the backfill endpoint.
        $result = ['ok' => false, 'error' => $eSp->getMessage()];
    }

    // Count how many of those predictions actually earned the first-scorer bonus.
    $winners = 0;
    try {
        $cnt = $db->prepare(
            "SELECT COUNT(*) AS n FROM wc_special_predictions
              WHERE match_id = :mid AND discontinue != 'true'
                AND pred_first_scorer_id = :fs"
        );
        $cnt->bindValue(':mid', $id,              PDO::PARAM_INT);
        $cnt->bindValue(':fs',  $first_scorer_id, PDO::PARAM_INT);
        $cnt->execute();
        $winners = (int)$cnt->fetchColumn();
    } catch (Exception $eCnt) { /* best-effort */ }

    echo json_encode([
        "message"              => "First scorer set + bonanza re-graded.",
        "match_id"             => $id,
        "first_scorer_id"      => $first_scorer_id,
        "bonanza_regraded"     => $result,
        "bonanza_winners"      => $winners,
        "per_user_bonus"       => WcSpecialPrediction::POINTS_FIRST_SCORER,
    ]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["message" => "Set failed: " . $e->getMessage()]);
}
?>
