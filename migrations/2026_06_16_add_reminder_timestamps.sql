-- =====================================================================
-- Refer-and-Earn admin reminder tracking.
--
-- When an admin clicks the SMS or WhatsApp button on the WC Leaderboard
-- admin page, we stamp the time so the same admin (or another) can see
-- on any device which participants have already been reminded.
-- NULL = not yet reminded on that channel.
-- =====================================================================

ALTER TABLE `wc_participants`
  ADD COLUMN `sms_reminder_sent_at`      DATETIME NULL AFTER `gold_coins`,
  ADD COLUMN `whatsapp_reminder_sent_at` DATETIME NULL AFTER `sms_reminder_sent_at`;
