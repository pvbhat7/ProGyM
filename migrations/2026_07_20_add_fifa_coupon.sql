-- Add per-participant thank-you coupon (50% gym-membership discount) that the
-- gym counter can validate at redemption time. Codes are deterministic (same
-- for a given client_id) and are backfilled by /api/wc_participants/backfillCoupons.php
-- using the identical algorithm shipped in the wc2026-app frontend, so codes
-- already sent via WhatsApp stay valid.

ALTER TABLE `wc_participants`
  ADD COLUMN `fifa_coupon` VARCHAR(20) NULL DEFAULT NULL AFTER `total_coins_earned`,
  ADD UNIQUE KEY `uq_fifa_coupon` (`fifa_coupon`);
