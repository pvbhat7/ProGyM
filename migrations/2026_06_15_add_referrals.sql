-- =====================================================================
-- Refer & Earn for World Cup 2026 campaign.
--
-- - Each participant gets a 6-char unique `referral_code` and a
--   `gold_coins` balance (separate from football/prediction coins).
-- - `wc_referrals` records every referral attempt. A row is created at
--   register time when a referee submits with ?ref=CODE; coins are
--   credited only when the referee places their FIRST prediction.
-- - 1 mobile / client_id can be the *referred* party only once
--   (lifetime), via UNIQUE on referred_client_id.
-- =====================================================================

ALTER TABLE `wc_participants`
  ADD COLUMN `referral_code` VARCHAR(10)  NULL UNIQUE AFTER `client_id`,
  ADD COLUMN `gold_coins`    INT NOT NULL DEFAULT 0  AFTER `total_matches_predicted`;

CREATE TABLE IF NOT EXISTS `wc_referrals` (
  `id`                            INT AUTO_INCREMENT PRIMARY KEY,
  `referrer_client_id`            INT      NOT NULL,
  `referred_client_id`            INT      NOT NULL,
  `coins_awarded`                 INT      NOT NULL DEFAULT 0,
  `status`                        VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | credited
  `created_at`                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `credited_at`                   DATETIME NULL,
  UNIQUE KEY `uq_referred` (`referred_client_id`),
  KEY `ix_referrer` (`referrer_client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
