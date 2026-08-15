-- =========================================================================
-- DEV ONLY — reset a settled match back to 'upcoming' so you can settle it
-- again and trigger the FCM "prediction settled" push.
--
-- HOW TO USE:
--   1. Pick a match_id you want to re-test on. Use Step 0 below to list
--      candidates (recently settled matches with at least one prediction).
--   2. Replace the value of @match_id below with that id.
--   3. Run the WHOLE block as one batch in phpMyAdmin → SQL tab.
--
-- WHAT IT DOES:
--   a) Subtracts every prediction's coins_awarded from the participant's
--      total_coins_earned so leaderboard / "Football Collection" don't
--      double-count when the match is settled again.
--   b) Resets the predictions on this match to unsettled (is_settled='no',
--      coins_awarded=0, settled_at=NULL).
--   c) Resets the match row itself back to status='upcoming' and clears
--      winner/score/MOTM/first-scorer/etc.
--   d) Wipes wc_notifications_log rows whose event_key references this
--      match — frees the idempotency dedup so the next settle re-pushes.
--
-- SAFE TO RUN MULTIPLE TIMES.
-- =========================================================================

SET @match_id := 0;     -- <<< EDIT THIS: the match you want to reset

-- ---------- Step 0 (read-only) — candidates to reset --------------------
-- Settled matches with predictions, most recent first:
-- SELECT m.id, ta.short_code AS A, tb.short_code AS B,
--        m.score_a, m.score_b, m.winner, m.settled_at,
--        (SELECT COUNT(*) FROM wc_predictions p WHERE p.match_id = m.id) AS preds
--   FROM wc_matches m
--   JOIN wc_teams ta ON ta.id = m.team_a_id
--   JOIN wc_teams tb ON tb.id = m.team_b_id
--  WHERE m.status = 'settled'
--  ORDER BY m.settled_at DESC
--  LIMIT 20;

-- ---------- 1. Roll back coin totals on wc_participants -----------------
UPDATE wc_participants pa
JOIN (
    SELECT client_id, COALESCE(SUM(coins_awarded), 0) AS to_subtract
      FROM wc_predictions
     WHERE match_id   = @match_id
       AND is_settled = 'yes'
  GROUP BY client_id
) x ON x.client_id = pa.client_id
SET pa.total_coins_earned = GREATEST(0, pa.total_coins_earned - x.to_subtract);

-- ---------- 2. Reset predictions on this match -------------------------
UPDATE wc_predictions
   SET is_settled    = 'no',
       coins_awarded = 0,
       settled_at    = NULL
 WHERE match_id = @match_id;

-- ---------- 3. Reset the match row -------------------------------------
UPDATE wc_matches
   SET status            = 'upcoming',
       winner            = NULL,
       score_a           = NULL,
       score_b           = NULL,
       first_scorer_id   = NULL,
       motm_id           = NULL,
       total_goals_range = NULL,
       both_teams_scored = NULL,
       settled_at        = NULL,
       result_source     = NULL
 WHERE id = @match_id;

-- ---------- 4. Free idempotency dedup in the FCM log -------------------
DELETE FROM wc_notifications_log
 WHERE event_key LIKE CONCAT('settle:pred:%')
   AND client_id IN (
       SELECT client_id FROM wc_predictions WHERE match_id = @match_id
   );

DELETE FROM wc_notifications_log
 WHERE event_key = CONCAT('kickoff:match:', @match_id)
    OR event_key LIKE CONCAT('kickoff:match:', @match_id, ':%');

DELETE FROM wc_notifications_log
 WHERE event_key LIKE CONCAT('result:match:', @match_id, ':%');

-- ---------- 5. Verify --------------------------------------------------
SELECT 'match'        AS what, id AS ref, status,            CONCAT(IFNULL(score_a,'-'),'-',IFNULL(score_b,'-')) AS info FROM wc_matches WHERE id = @match_id
UNION ALL
SELECT 'predictions', COUNT(*), GROUP_CONCAT(DISTINCT is_settled), SUM(coins_awarded) FROM wc_predictions WHERE match_id = @match_id;
