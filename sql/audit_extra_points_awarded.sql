-- =====================================================================
-- AUDIT — find users who were overpaid under the old scoring rules.
--
-- OLD rules:  base (up to 32 across 6 categories) × match multiplier (1..5)
-- NEW rules:  flat base (up to 20 across 4 categories: winner, both-score,
--             MOTM, exact-score). No multiplier.
--
-- Run on Hostinger phpMyAdmin (database: u636480992_ggs). Read-only.
-- =====================================================================

-- ---------------------------------------------------------------------
-- QUERY 1 — per-prediction breakdown of extra coins received.
-- One row for every settled prediction that earned MORE than the new
-- flat-20 rules would have awarded.
-- ---------------------------------------------------------------------
SELECT
    p.id                                            AS prediction_id,
    p.client_id,
    c.name                                          AS client_name,
    p.match_id,
    m.stage,
    m.multiplier                                    AS old_multiplier,
    p.coins_awarded                                 AS old_coins,
    (
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
    )                                               AS new_coins,
    p.coins_awarded - (
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
    )                                               AS extra_coins
FROM wc_predictions p
JOIN wc_matches m  ON m.id = p.match_id
LEFT JOIN client c ON c.id = p.client_id
WHERE p.is_settled = 'yes'
  AND m.status     = 'settled'
HAVING extra_coins > 0
ORDER BY extra_coins DESC, p.client_id, p.match_id;


-- ---------------------------------------------------------------------
-- QUERY 2 — per-user summary: total extra coins received.
-- ---------------------------------------------------------------------
SELECT
    p.client_id,
    c.name                                          AS client_name,
    COUNT(*)                                        AS overpaid_predictions,
    SUM(p.coins_awarded)                            AS total_old_coins,
    SUM(
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
    )                                               AS total_new_coins,
    SUM(p.coins_awarded) - SUM(
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
    )                                               AS total_extra_coins
FROM wc_predictions p
JOIN wc_matches m  ON m.id = p.match_id
LEFT JOIN client c ON c.id = p.client_id
WHERE p.is_settled = 'yes'
  AND m.status     = 'settled'
GROUP BY p.client_id, c.name
HAVING total_extra_coins > 0
ORDER BY total_extra_coins DESC;


-- ---------------------------------------------------------------------
-- QUERY 3 — overall totals.
-- ---------------------------------------------------------------------
SELECT
    COUNT(DISTINCT p.client_id)                     AS users_affected,
    COUNT(*)                                        AS predictions_affected,
    SUM(p.coins_awarded) - SUM(
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
    )                                               AS total_extra_coins_distributed
FROM wc_predictions p
JOIN wc_matches m
  ON m.id = p.match_id
WHERE p.is_settled = 'yes'
  AND m.status     = 'settled'
  AND p.coins_awarded > (
        CASE WHEN p.pred_winner     = m.winner            THEN 5 ELSE 0 END +
        CASE WHEN p.pred_both_score = m.both_teams_scored THEN 2 ELSE 0 END +
        CASE WHEN m.motm_id IS NOT NULL
              AND p.pred_motm_id = m.motm_id              THEN 5 ELSE 0 END +
        CASE WHEN p.pred_score_a = m.score_a
              AND p.pred_score_b = m.score_b              THEN 8 ELSE 0 END
      );
