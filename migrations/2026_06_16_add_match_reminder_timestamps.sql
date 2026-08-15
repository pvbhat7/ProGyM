-- =====================================================================
-- Per-match reminder tracking (admin WC Leaderboard page).
--
-- When an admin clicks SMS / WhatsApp in "match reminder" mode, we stamp
-- the row so other admins/devices see who's been nudged for the CURRENT
-- upcoming match.
--
-- These two columns are RESET to NULL inside WcScoringHelper::settleMatchPredictions
-- whenever a match transitions to 'settled' — so the next upcoming match
-- starts with a clean pending list automatically.
-- =====================================================================

ALTER TABLE `wc_participants`
  ADD COLUMN `match_reminder_sms_sent_at`      DATETIME NULL AFTER `whatsapp_reminder_sent_at`,
  ADD COLUMN `match_reminder_whatsapp_sent_at` DATETIME NULL AFTER `match_reminder_sms_sent_at`;
