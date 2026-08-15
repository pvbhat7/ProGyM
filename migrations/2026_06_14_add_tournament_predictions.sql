-- =====================================================================
-- Tournament-end "Major Awards" predictions.
-- Each user gets ONE submission (UNIQUE on client_id), locked forever.
-- Picks: World Cup Winner (100), Golden Ball (50), Golden Boot (50), Golden Glove (50)
-- Total max win = 250 footballs.
-- Settled in one shot by admin via api/wc_tournament_predictions/settle.php
-- when the tournament ends.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `wc_tournament_predictions` (
  `id`                          INT AUTO_INCREMENT PRIMARY KEY,
  `client_id`                   INT NOT NULL,
  `pred_winner_team_id`         INT NOT NULL,
  `pred_golden_ball_player_id`  INT NOT NULL,
  `pred_golden_boot_player_id`  INT NOT NULL,
  `pred_golden_glove_player_id` INT NOT NULL,
  `submitted_at`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `coins_awarded`               INT NOT NULL DEFAULT 0,
  `winner_correct`              VARCHAR(5) NOT NULL DEFAULT 'no',
  `ball_correct`                VARCHAR(5) NOT NULL DEFAULT 'no',
  `boot_correct`                VARCHAR(5) NOT NULL DEFAULT 'no',
  `glove_correct`               VARCHAR(5) NOT NULL DEFAULT 'no',
  `settled_at`                  DATETIME NULL,
  UNIQUE KEY `uq_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
