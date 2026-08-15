-- =====================================================================
-- FIFA World Cup 2026 — Teams Seed (48 teams, 12 groups A-L)
-- Run on Hostinger phpMyAdmin against database `u636480992_ggs`
-- Safe to re-run: uses INSERT IGNORE so duplicates are skipped.
-- =====================================================================

INSERT IGNORE INTO `wc_teams` (`name`, `short_code`, `group_name`, `flag`, `discontinue`) VALUES
-- Group A
('Mexico',                 'MEX', 'A', NULL, 'false'),
('South Korea',            'KOR', 'A', NULL, 'false'),
('Czechia',                'CZE', 'A', NULL, 'false'),
('South Africa',           'RSA', 'A', NULL, 'false'),

-- Group B
('Canada',                 'CAN', 'B', NULL, 'false'),
('Bosnia and Herzegovina', 'BIH', 'B', NULL, 'false'),
('Qatar',                  'QAT', 'B', NULL, 'false'),
('Switzerland',            'SUI', 'B', NULL, 'false'),

-- Group C
('Brazil',                 'BRA', 'C', NULL, 'false'),
('Morocco',                'MAR', 'C', NULL, 'false'),
('Haiti',                  'HAI', 'C', NULL, 'false'),
('Scotland',               'SCO', 'C', NULL, 'false'),

-- Group D
('USA',                    'USA', 'D', NULL, 'false'),
('Paraguay',               'PAR', 'D', NULL, 'false'),
('Australia',              'AUS', 'D', NULL, 'false'),
('Türkiye',                'TUR', 'D', NULL, 'false'),

-- Group E
('Germany',                'GER', 'E', NULL, 'false'),
('Curaçao',                'CUW', 'E', NULL, 'false'),
('Ivory Coast',            'CIV', 'E', NULL, 'false'),
('Ecuador',                'ECU', 'E', NULL, 'false'),

-- Group F
('Netherlands',            'NED', 'F', NULL, 'false'),
('Japan',                  'JPN', 'F', NULL, 'false'),
('Sweden',                 'SWE', 'F', NULL, 'false'),
('Tunisia',                'TUN', 'F', NULL, 'false'),

-- Group G
('Belgium',                'BEL', 'G', NULL, 'false'),
('Egypt',                  'EGY', 'G', NULL, 'false'),
('Iran',                   'IRN', 'G', NULL, 'false'),
('New Zealand',            'NZL', 'G', NULL, 'false'),

-- Group H
('Spain',                  'ESP', 'H', NULL, 'false'),
('Cabo Verde',             'CPV', 'H', NULL, 'false'),
('Saudi Arabia',           'KSA', 'H', NULL, 'false'),
('Uruguay',                'URU', 'H', NULL, 'false'),

-- Group I
('France',                 'FRA', 'I', NULL, 'false'),
('Senegal',                'SEN', 'I', NULL, 'false'),
('Iraq',                   'IRQ', 'I', NULL, 'false'),
('Norway',                 'NOR', 'I', NULL, 'false'),

-- Group J
('Argentina',              'ARG', 'J', NULL, 'false'),
('Algeria',                'ALG', 'J', NULL, 'false'),
('Austria',                'AUT', 'J', NULL, 'false'),
('Jordan',                 'JOR', 'J', NULL, 'false'),

-- Group K
('Portugal',               'POR', 'K', NULL, 'false'),
('DR Congo',               'COD', 'K', NULL, 'false'),
('Uzbekistan',             'UZB', 'K', NULL, 'false'),
('Colombia',               'COL', 'K', NULL, 'false'),

-- Group L
('England',                'ENG', 'L', NULL, 'false'),
('Croatia',                'CRO', 'L', NULL, 'false'),
('Ghana',                  'GHA', 'L', NULL, 'false'),
('Panama',                 'PAN', 'L', NULL, 'false');


-- =====================================================================
-- VERIFY:
--   SELECT COUNT(*) FROM wc_teams;                    -- should return 48
--   SELECT group_name, COUNT(*) FROM wc_teams
--     GROUP BY group_name ORDER BY group_name;         -- 12 rows, 4 each
--   SELECT * FROM wc_teams WHERE group_name='A';       -- preview group A
-- =====================================================================
