-- =====================================================================
-- Fix: every match should award flat 20 points, no stage multipliers.
-- Run this ONCE on Hostinger phpMyAdmin (database: u636480992_ggs).
-- =====================================================================

-- 1) Reset every match's stage multiplier to 1.
UPDATE wc_matches SET multiplier = 1 WHERE multiplier <> 1;

-- 2) Sanity check — should return 0 rows after the update above.
SELECT id, stage, multiplier FROM wc_matches WHERE multiplier <> 1;
