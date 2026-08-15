-- Daily leaderboard snapshot — one row per active participant per match-day.
-- Used to break ties on the overall leaderboard when two players share the same
-- football count. Tie-breakers (in order): lower sum of daily_rank → more days
-- finishing in top 3 → earliest first prediction (from wc_predictions.submitted_at).
--
-- Populated by WcParticipant::snapshotDailyLeaderboard($dateYmd), called from
-- the match-settlement paths (admin settle + cron auto-settle) after every
-- match is finalized.

CREATE TABLE IF NOT EXISTS wc_daily_leaderboard_snapshot (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    client_id       INT       NOT NULL,
    snapshot_date   DATE      NOT NULL,
    footballs_total DOUBLE    NOT NULL,
    daily_rank      INT       NOT NULL,
    created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_client_date (client_id, snapshot_date),
    KEY idx_date (snapshot_date),
    KEY idx_client (client_id)
);
