-- =====================================================================
-- FIFA World Cup Prediction Campaign — Schema (5 tables)
-- Run this ONCE on Hostinger phpMyAdmin against database `u636480992_ggs`
-- All tables are idempotent (IF NOT EXISTS) so re-running is safe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) wc_teams — 32 World Cup teams
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wc_teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `short_code` varchar(10) NOT NULL,
  `flag` varchar(255) DEFAULT NULL,
  `group_name` varchar(5) DEFAULT NULL,
  `discontinue` varchar(10) NOT NULL DEFAULT 'false',
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_name`),
  KEY `idx_discontinue` (`discontinue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 2) wc_players — ~736 players (32 teams x 23)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wc_players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `position` varchar(30) DEFAULT NULL,
  `jersey_number` int(11) DEFAULT NULL,
  `discontinue` varchar(10) NOT NULL DEFAULT 'false',
  PRIMARY KEY (`id`),
  KEY `idx_team_id` (`team_id`),
  KEY `idx_discontinue` (`discontinue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 3) wc_matches — each scheduled match + result fields
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wc_matches` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_a_id` int(11) NOT NULL,
  `team_b_id` int(11) NOT NULL,
  `stage` varchar(20) NOT NULL DEFAULT 'group',
  `multiplier` double NOT NULL DEFAULT 1,
  `kickoff_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'upcoming',
  `winner` varchar(10) DEFAULT NULL,
  `score_a` int(11) DEFAULT NULL,
  `score_b` int(11) DEFAULT NULL,
  `first_scorer_id` int(11) DEFAULT NULL,
  `motm_id` int(11) DEFAULT NULL,
  `total_goals_range` varchar(15) DEFAULT NULL,
  `both_teams_scored` varchar(5) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  `discontinue` varchar(10) NOT NULL DEFAULT 'false',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_kickoff` (`kickoff_at`),
  KEY `idx_stage` (`stage`),
  KEY `idx_team_a` (`team_a_id`),
  KEY `idx_team_b` (`team_b_id`),
  KEY `idx_discontinue` (`discontinue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 4) wc_predictions — one row per (client, match) submission
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wc_predictions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_id` int(11) NOT NULL,
  `match_id` int(11) NOT NULL,
  `pred_winner` varchar(10) DEFAULT NULL,
  `pred_both_score` varchar(5) DEFAULT NULL,
  `pred_total_goals_range` varchar(15) DEFAULT NULL,
  `pred_first_scorer_id` int(11) DEFAULT NULL,
  `pred_motm_id` int(11) DEFAULT NULL,
  `pred_score_a` int(11) DEFAULT NULL,
  `pred_score_b` int(11) DEFAULT NULL,
  `coins_awarded` double NOT NULL DEFAULT 0,
  `is_settled` varchar(5) NOT NULL DEFAULT 'no',
  `submitted_at` datetime DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_client_match` (`client_id`, `match_id`),
  KEY `idx_match_id` (`match_id`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_is_settled` (`is_settled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ---------------------------------------------------------------------
-- 5) wc_participants — registry of everyone who joined the campaign
--    (gym members + non-members). Used for campaign-only reports,
--    FCM sends, leaderboard tiebreaker, and conversion attribution.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wc_participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_id` int(11) NOT NULL,
  `joined_at` datetime NOT NULL,
  `source` varchar(30) NOT NULL DEFAULT 'non_member_signup',
  `was_gym_client_at_join` varchar(5) NOT NULL DEFAULT 'no',
  `converted_to_member_at` datetime DEFAULT NULL,
  `total_coins_earned` double NOT NULL DEFAULT 0,
  `total_matches_predicted` int(11) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_client_id` (`client_id`),
  KEY `idx_source` (`source`),
  KEY `idx_status` (`status`),
  KEY `idx_was_gym_client` (`was_gym_client_at_join`),
  KEY `idx_converted` (`converted_to_member_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =====================================================================
-- DONE. Verify with:
--   SHOW TABLES LIKE 'wc_%';
--   DESCRIBE wc_teams;
--   DESCRIBE wc_players;
--   DESCRIBE wc_matches;
--   DESCRIBE wc_predictions;
--   DESCRIBE wc_participants;
-- =====================================================================
