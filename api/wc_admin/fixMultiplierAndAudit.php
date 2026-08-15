<?php
/**
 * ONE-SHOT admin tool. Run once after deploying the flat-20-point scoring fix.
 *
 *   1. UPDATE wc_matches SET multiplier = 1 (kills 1.5x / 2x / 3x / 5x stage scaling).
 *   2. Audits every settled prediction and reports how many footballs each user
 *      received in excess of the new flat rules.
 *
 * Old per-match max: up to 32 base x stage multiplier (1, 1.5, 2, 3, 5).
 * New per-match max: flat 20  (winner 5 + both-score 2 + MOTM 5 + exact-score 8).
 *
 * Read-only audit — DOES NOT touch wc_predictions.coins_awarded or
 * wc_participants.total_coins_earned. Decide claw-back / compensation after
 * reviewing the report.
 *
 * URL:  https://tavrostechinfo.com/PROGYM/ggs/api/wc_admin/fixMultiplierAndAudit.php
 *
 * Safe to refresh — the UPDATE is idempotent (already-1 rows are skipped by
 * the WHERE clause), and the audit is a pure SELECT.
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();
if (!$db) {
    http_response_code(500);
    echo json_encode(["ok" => false, "message" => "DB connection failed."]);
    exit;
}

try {
    // ---- 1) Reset multipliers ----------------------------------------
    $rowsBefore = (int)$db->query(
        "SELECT COUNT(*) FROM wc_matches WHERE multiplier <> 1"
    )->fetchColumn();

    $upd = $db->prepare("UPDATE wc_matches SET multiplier = 1 WHERE multiplier <> 1");
    $upd->execute();
    $rowsUpdated = $upd->rowCount();

    $rowsAfter = (int)$db->query(
        "SELECT COUNT(*) FROM wc_matches WHERE multiplier <> 1"
    )->fetchColumn();

    // ---- 2) Audit overpaid predictions -------------------------------
    // Expression that computes what each prediction SHOULD have earned
    // under the new rules (flat 20-point per match).
    $newCoinsExpr = "(
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
    )";

    // Overall totals
    $sql = "
        SELECT
            COUNT(DISTINCT p.client_id) AS users_affected,
            COUNT(*)                    AS predictions_affected,
            ROUND(SUM(p.coins_awarded - $newCoinsExpr), 2) AS total_extra_coins
        FROM wc_predictions p
        JOIN wc_matches m ON m.id = p.match_id
        WHERE p.is_settled = 'yes'
          AND m.status     = 'settled'
          AND p.coins_awarded > $newCoinsExpr
    ";
    $overall = $db->query($sql)->fetch(PDO::FETCH_ASSOC);

    // Per-user breakdown
    $sql = "
        SELECT
            p.client_id,
            c.name                                    AS client_name,
            COUNT(*)                                  AS overpaid_predictions,
            ROUND(SUM(p.coins_awarded), 2)            AS total_old_coins,
            ROUND(SUM($newCoinsExpr), 2)              AS total_new_coins,
            ROUND(SUM(p.coins_awarded - $newCoinsExpr), 2) AS total_extra_coins
        FROM wc_predictions p
        JOIN wc_matches m   ON m.id = p.match_id
        LEFT JOIN client c  ON c.id = p.client_id
        WHERE p.is_settled = 'yes'
          AND m.status     = 'settled'
        GROUP BY p.client_id, c.name
        HAVING total_extra_coins > 0
        ORDER BY total_extra_coins DESC
    ";
    $perUser = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    // Per-prediction breakdown (top 200 most-overpaid)
    $sql = "
        SELECT
            p.id                              AS prediction_id,
            p.client_id,
            c.name                            AS client_name,
            p.match_id,
            m.stage,
            ROUND(p.coins_awarded, 2)         AS old_coins,
            $newCoinsExpr                     AS new_coins,
            ROUND(p.coins_awarded - $newCoinsExpr, 2) AS extra_coins
        FROM wc_predictions p
        JOIN wc_matches m   ON m.id = p.match_id
        LEFT JOIN client c  ON c.id = p.client_id
        WHERE p.is_settled = 'yes'
          AND m.status     = 'settled'
          AND p.coins_awarded > $newCoinsExpr
        ORDER BY (p.coins_awarded - $newCoinsExpr) DESC
        LIMIT 200
    ";
    $perPrediction = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "ok"                    => true,
        "multiplier_reset" => [
            "rows_needing_update_before" => $rowsBefore,
            "rows_updated"               => (int)$rowsUpdated,
            "rows_still_not_1_after"     => $rowsAfter,
        ],
        "audit_overall" => $overall,
        "audit_per_user"        => $perUser,
        "audit_per_prediction_top200" => $perPrediction,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "ok"      => false,
        "message" => $e->getMessage(),
    ]);
}
?>
