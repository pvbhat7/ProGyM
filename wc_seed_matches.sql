-- =====================================================================
-- FIFA World Cup 2026 — Group Stage Schedule Seed (72 matches)
-- Auto-generated from Wikipedia "2026 FIFA World Cup Group X" pages.
-- Times converted from local stadium time to IST (Asia/Calcutta, UTC+5:30).
-- Safe to re-run: existing matches (same teams + kickoff) are skipped via UNIQUE-ish check.
-- =====================================================================

INSERT INTO `wc_matches` (`team_a_id`, `team_b_id`, `stage`, `multiplier`, `kickoff_at`, `status`, `winner`, `score_a`, `score_b`, `discontinue`)
SELECT ta.id, tb.id, p.stage, p.multiplier, p.kickoff_at, p.status, p.winner, p.score_a, p.score_b, 'false'
FROM (
  SELECT 'MEX' AS code_a, 'RSA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-12 00:30:00' AS kickoff_at, 'settled' AS status, 'A' AS winner, 2 AS score_a, 0 AS score_b
  UNION ALL
  SELECT 'KOR' AS code_a, 'CZE' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-12 07:30:00' AS kickoff_at, 'settled' AS status, 'A' AS winner, 2 AS score_a, 1 AS score_b
  UNION ALL
  SELECT 'CZE' AS code_a, 'RSA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-18 21:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'MEX' AS code_a, 'KOR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-19 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CZE' AS code_a, 'MEX' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-25 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'RSA' AS code_a, 'KOR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-25 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CAN' AS code_a, 'BIH' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-13 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'QAT' AS code_a, 'SUI' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-14 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'SUI' AS code_a, 'BIH' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-19 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CAN' AS code_a, 'QAT' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-19 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'SUI' AS code_a, 'CAN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-25 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'BIH' AS code_a, 'QAT' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-25 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'BRA' AS code_a, 'MAR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-14 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'HAI' AS code_a, 'SCO' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-14 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'SCO' AS code_a, 'MAR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-20 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'BRA' AS code_a, 'HAI' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-20 06:00:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'SCO' AS code_a, 'BRA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-25 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'MAR' AS code_a, 'HAI' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-25 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'USA' AS code_a, 'PAR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-13 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'AUS' AS code_a, 'TUR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-14 09:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'USA' AS code_a, 'AUS' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-20 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'TUR' AS code_a, 'PAR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-20 08:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'TUR' AS code_a, 'USA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-26 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'PAR' AS code_a, 'AUS' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-26 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'GER' AS code_a, 'CUW' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-14 22:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CIV' AS code_a, 'ECU' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-15 04:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'GER' AS code_a, 'CIV' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-21 01:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ECU' AS code_a, 'CUW' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-21 05:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CUW' AS code_a, 'CIV' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-26 01:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ECU' AS code_a, 'GER' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-26 01:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'NED' AS code_a, 'JPN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-15 01:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'SWE' AS code_a, 'TUN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-15 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'NED' AS code_a, 'SWE' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-20 22:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'TUN' AS code_a, 'JPN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-21 09:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'JPN' AS code_a, 'SWE' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-26 04:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'TUN' AS code_a, 'NED' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-26 04:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'BEL' AS code_a, 'EGY' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-16 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'IRN' AS code_a, 'NZL' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-16 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'BEL' AS code_a, 'IRN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-22 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'NZL' AS code_a, 'EGY' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-22 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'EGY' AS code_a, 'IRN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-27 08:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'NZL' AS code_a, 'BEL' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-27 08:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ESP' AS code_a, 'CPV' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-15 21:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'KSA' AS code_a, 'URU' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-16 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ESP' AS code_a, 'KSA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-21 21:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'URU' AS code_a, 'CPV' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-22 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CPV' AS code_a, 'KSA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-27 05:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'URU' AS code_a, 'ESP' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-27 05:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'FRA' AS code_a, 'SEN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-17 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'IRQ' AS code_a, 'NOR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-17 03:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'FRA' AS code_a, 'IRQ' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-23 02:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'NOR' AS code_a, 'SEN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-23 05:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'NOR' AS code_a, 'FRA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-27 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'SEN' AS code_a, 'IRQ' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-27 00:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ARG' AS code_a, 'ALG' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-17 06:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'AUT' AS code_a, 'JOR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-17 09:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ARG' AS code_a, 'AUT' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-22 22:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'JOR' AS code_a, 'ALG' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-23 08:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ALG' AS code_a, 'AUT' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-28 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'JOR' AS code_a, 'ARG' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-28 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'POR' AS code_a, 'COD' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-17 22:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'UZB' AS code_a, 'COL' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-18 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'POR' AS code_a, 'UZB' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-23 22:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'COL' AS code_a, 'COD' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-24 07:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'COL' AS code_a, 'POR' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-28 05:00:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'COD' AS code_a, 'UZB' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-28 05:00:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ENG' AS code_a, 'CRO' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-18 01:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'GHA' AS code_a, 'PAN' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-18 04:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'ENG' AS code_a, 'GHA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-24 01:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'PAN' AS code_a, 'CRO' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-24 04:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'PAN' AS code_a, 'ENG' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-28 02:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
  UNION ALL
  SELECT 'CRO' AS code_a, 'GHA' AS code_b, 'group' AS stage, 1 AS multiplier, '2026-06-28 02:30:00' AS kickoff_at, 'upcoming' AS status, NULL AS winner, NULL AS score_a, NULL AS score_b
) p
JOIN `wc_teams` ta ON ta.short_code = p.code_a
JOIN `wc_teams` tb ON tb.short_code = p.code_b
LEFT JOIN `wc_matches` existing
  ON existing.team_a_id = ta.id AND existing.team_b_id = tb.id AND existing.kickoff_at = p.kickoff_at
WHERE existing.id IS NULL;

-- =====================================================================
-- VERIFY:
--   SELECT COUNT(*) FROM wc_matches;                              -- expect 72
--   SELECT status, COUNT(*) FROM wc_matches GROUP BY status;
--   SELECT m.kickoff_at, ta.short_code, tb.short_code, m.status, m.score_a, m.score_b
--     FROM wc_matches m
--     JOIN wc_teams ta ON ta.id=m.team_a_id
--     JOIN wc_teams tb ON tb.id=m.team_b_id
--     ORDER BY m.kickoff_at LIMIT 10;
-- =====================================================================