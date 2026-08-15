-- =====================================================================
-- Adds wc_matches.result_source so we can distinguish:
--   pending       — match not yet settled
--   espn_partial  — auto-settled by cron (winner/score), MOTM still owed
--   complete      — admin has added MOTM via topUpMotm.php (or settle.php
--                   ran with motm_id supplied = the old admin path)
--
-- Run once on the live DB (phpMyAdmin or any MySQL client).
-- =====================================================================

ALTER TABLE `wc_matches`
  ADD COLUMN `result_source` VARCHAR(20) NOT NULL DEFAULT 'pending'
  AFTER `settled_at`;

-- Backfill: every already-settled match counts as 'complete' (admin handled it before).
UPDATE `wc_matches`
   SET `result_source` = 'complete'
 WHERE `status` = 'settled';
