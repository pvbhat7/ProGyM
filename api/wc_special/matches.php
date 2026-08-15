<?php
// Returns the 4 Knockout Bonanza matches (M101-M104) with teams, kickoff,
// lock window, and (optionally) the requesting user's existing predictions.
//
// GET /api/wc_special/matches.php?client_id=123
//   client_id is optional — omit for anon read.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }

$sql = "SELECT m.id, m.team_a_id, m.team_b_id, m.team_a_label, m.team_b_label,
               m.stage, m.kickoff_at, m.status,
               m.winner, m.score_a, m.score_b, m.first_scorer_id, m.motm_id,
               ta.name AS team_a_name, ta.short_code AS team_a_code, ta.flag AS team_a_flag,
               tb.name AS team_b_name, tb.short_code AS team_b_code, tb.flag AS team_b_flag,
               sp.name AS first_scorer_name, mp.name AS motm_name,
               (DATE_SUB(m.kickoff_at, INTERVAL 15 MINUTE) > NOW())   AS predictions_open,
               (DATE_SUB(m.kickoff_at, INTERVAL 24 HOUR)   <= NOW())  AS window_started
        FROM wc_matches m
        LEFT JOIN wc_teams   ta ON ta.id = m.team_a_id
        LEFT JOIN wc_teams   tb ON tb.id = m.team_b_id
        LEFT JOIN wc_players sp ON sp.id = m.first_scorer_id
        LEFT JOIN wc_players mp ON mp.id = m.motm_id
        WHERE m.id IN (101,102,103,104) AND m.discontinue != 'true'
        ORDER BY m.id ASC";
$rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

// User predictions (optional)
$preds = [];
if ($client_id > 0) {
    $sp = new WcSpecialPrediction($db);
    foreach ($sp->getUserPredictions($client_id) as $p) {
        $preds[(int)$p['match_id']] = $p;
    }
}

// Tiebreaker lock status
$tb = $db->query("SELECT (DATE_SUB(kickoff_at, INTERVAL 15 MINUTE) > NOW()) AS open_now,
                         kickoff_at FROM wc_matches WHERE id = 101");
$tbRow = $tb->fetch(PDO::FETCH_ASSOC);

$tbUser = null;
if ($client_id > 0) {
    $sp = new WcSpecialPrediction($db);
    $tbUser = $sp->getUserTiebreaker($client_id);
}

$out = [];
foreach ($rows as $r) {
    $row = [
        'id'               => (int)$r['id'],
        'stage'            => $r['stage'],
        'kickoff_at'       => $r['kickoff_at'],
        'status'           => $r['status'],
        'predictions_open' => (int)$r['predictions_open'] === 1,
        'window_started'   => (int)$r['window_started'] === 1,
        'team_a' => [
            'id'    => $r['team_a_id'] !== null ? (int)$r['team_a_id'] : null,
            'name'  => $r['team_a_name'],
            'code'  => $r['team_a_code'],
            'flag'  => $r['team_a_flag'],
            'label' => $r['team_a_label'],
        ],
        'team_b' => [
            'id'    => $r['team_b_id'] !== null ? (int)$r['team_b_id'] : null,
            'name'  => $r['team_b_name'],
            'code'  => $r['team_b_code'],
            'flag'  => $r['team_b_flag'],
            'label' => $r['team_b_label'],
        ],
        // result fields (null until settled)
        'winner'            => $r['winner'],
        'score_a'           => $r['score_a'] !== null ? (int)$r['score_a'] : null,
        'score_b'           => $r['score_b'] !== null ? (int)$r['score_b'] : null,
        'first_scorer_id'   => $r['first_scorer_id'] !== null ? (int)$r['first_scorer_id'] : null,
        'first_scorer_name' => $r['first_scorer_name'],
        'motm_id'           => $r['motm_id'] !== null ? (int)$r['motm_id'] : null,
        'motm_name'         => $r['motm_name'],
    ];
    if (isset($preds[(int)$r['id']])) {
        $row['my_prediction'] = $preds[(int)$r['id']];
    }
    $out[] = $row;
}

$isEliminated = false;
if ($client_id > 0) {
    $sp = new WcSpecialPrediction($db);
    $isEliminated = $sp->isEliminated($client_id);
}

echo json_encode([
    'ok' => true,
    'matches' => $out,
    'is_eliminated' => $isEliminated,
    'tiebreaker' => [
        'open'        => $tbRow ? ((int)$tbRow['open_now'] === 1) : false,
        'locks_at'    => $tbRow ? $tbRow['kickoff_at'] : null,
        'my_estimate' => $tbUser,
    ],
    'scoring' => [
        'winner'       => WcSpecialPrediction::POINTS_WINNER,
        'exact_score'  => WcSpecialPrediction::POINTS_SCORE,
        'first_scorer' => WcSpecialPrediction::POINTS_FIRST_SCORER,
        'motm'         => WcSpecialPrediction::POINTS_MOTM,
        'perfect_bracket_bonus' => WcSpecialPrediction::POINTS_PERFECT_BRACKET,
        'max_per_match' => WcSpecialPrediction::POINTS_WINNER + WcSpecialPrediction::POINTS_SCORE + WcSpecialPrediction::POINTS_FIRST_SCORER + WcSpecialPrediction::POINTS_MOTM,
        'max_total'     => 4 * (WcSpecialPrediction::POINTS_WINNER + WcSpecialPrediction::POINTS_SCORE + WcSpecialPrediction::POINTS_FIRST_SCORER + WcSpecialPrediction::POINTS_MOTM) + WcSpecialPrediction::POINTS_PERFECT_BRACKET,
    ],
]);
?>
