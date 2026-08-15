<?php
/**
 * GET /api/wc_standings/getAll.php
 * Computes group-stage standings on the fly from settled wc_matches.
 *
 * For each team in the tournament:
 *   played, won, drawn, lost, goals_for, goals_against, goal_diff, points
 * Tie-breaker order: points DESC → goal_diff DESC → goals_for DESC.
 *
 * Response shape:
 *   {
 *     "as_of": "2026-06-13T05:00:00Z",
 *     "groups": [
 *       { "group_name": "A", "teams": [Row, Row, Row, Row] },
 *       ...
 *     ]
 *   }
 *
 * Row shape:
 *   {
 *     "team_id": 12, "name": "Mexico", "short_code": "MEX", "flag": "...",
 *     "played": 1, "won": 1, "drawn": 0, "lost": 0,
 *     "goals_for": 2, "goals_against": 0, "goal_diff": 2, "points": 3
 *   }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Cache-Control: public, max-age=30");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$sql = "
    SELECT
        t.id           AS team_id,
        t.name         AS name,
        t.short_code   AS short_code,
        t.flag         AS flag,
        t.group_name   AS group_name,
        COALESCE(SUM(s.played), 0)        AS played,
        COALESCE(SUM(s.won),    0)        AS won,
        COALESCE(SUM(s.drawn),  0)        AS drawn,
        COALESCE(SUM(s.lost),   0)        AS lost,
        COALESCE(SUM(s.goals_for),     0) AS goals_for,
        COALESCE(SUM(s.goals_against), 0) AS goals_against,
        COALESCE(SUM(s.won)*3 + SUM(s.drawn), 0) AS points
    FROM wc_teams t
    LEFT JOIN (
        -- Team A perspective
        SELECT team_a_id AS team_id, 1 AS played,
               CASE WHEN winner='A'    THEN 1 ELSE 0 END AS won,
               CASE WHEN winner='DRAW' THEN 1 ELSE 0 END AS drawn,
               CASE WHEN winner='B'    THEN 1 ELSE 0 END AS lost,
               score_a AS goals_for, score_b AS goals_against
        FROM wc_matches
        WHERE status='settled' AND discontinue='false' AND stage='group'
        UNION ALL
        -- Team B perspective
        SELECT team_b_id AS team_id, 1 AS played,
               CASE WHEN winner='B'    THEN 1 ELSE 0 END AS won,
               CASE WHEN winner='DRAW' THEN 1 ELSE 0 END AS drawn,
               CASE WHEN winner='A'    THEN 1 ELSE 0 END AS lost,
               score_b AS goals_for, score_a AS goals_against
        FROM wc_matches
        WHERE status='settled' AND discontinue='false' AND stage='group'
    ) s ON s.team_id = t.id
    WHERE t.discontinue = 'false'
    GROUP BY t.id, t.name, t.short_code, t.flag, t.group_name
    ORDER BY t.group_name ASC, points DESC, (goals_for - goals_against) DESC, goals_for DESC, t.name ASC
";

$stmt = $db->query($sql);

$grouped = array();
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $g = $r['group_name'];
    if (!isset($grouped[$g])) $grouped[$g] = array();
    $grouped[$g][] = array(
        "team_id"       => (int)$r['team_id'],
        "name"          => $r['name'],
        "short_code"    => $r['short_code'],
        "flag"          => $r['flag'],
        "played"        => (int)$r['played'],
        "won"           => (int)$r['won'],
        "drawn"         => (int)$r['drawn'],
        "lost"          => (int)$r['lost'],
        "goals_for"     => (int)$r['goals_for'],
        "goals_against" => (int)$r['goals_against'],
        "goal_diff"     => (int)$r['goals_for'] - (int)$r['goals_against'],
        "points"        => (int)$r['points'],
    );
}

$groups = array();
foreach ($grouped as $g => $teams) {
    $groups[] = array("group_name" => $g, "teams" => $teams);
}

echo json_encode(array(
    "as_of"  => gmdate('Y-m-d\TH:i:s\Z'),
    "groups" => $groups,
));
?>
