-- Adds columns for ESPN per-match summary stats (possession, shots, etc.)
-- and goal-scorer timeline. Run once in phpMyAdmin against u636480992_ggs.
--
-- espn_event_id    : ESPN's event id for this fixture; captured by the
--                    auto-settle cron when it first matches our row.
-- stats_json       : JSON of the boxscore team-statistics block
--                    { "team_a": { "possession": "62%", "shots": "14", ... },
--                      "team_b": { ... } }
-- goals_json       : JSON array of goal events
--                    [ { "minute": "23'", "side": "A", "scorer": "Mbappé",
--                        "type": "Penalty" }, ... ]
-- stats_fetched_at : Last successful ESPN summary fetch (NULL = not yet fetched).

ALTER TABLE wc_matches
    ADD COLUMN espn_event_id   VARCHAR(50)  NULL AFTER result_source,
    ADD COLUMN stats_json      MEDIUMTEXT   NULL AFTER espn_event_id,
    ADD COLUMN goals_json      MEDIUMTEXT   NULL AFTER stats_json,
    ADD COLUMN stats_fetched_at DATETIME    NULL AFTER goals_json;
