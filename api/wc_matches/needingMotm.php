<?php
/**
 * Lists matches that were auto-settled by ESPN (result_source='espn_partial')
 * and still need the MOTM bonus to be awarded by admin. Used to power the
 * "MOTM Pending" queue on the admin matches page.
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$sql = "SELECT m.id, m.team_a_id, m.team_b_id, m.stage, m.multiplier,
               m.kickoff_at, m.status, m.winner, m.score_a, m.score_b,
               m.settled_at, m.result_source,
               ta.name AS team_a_name, ta.short_code AS team_a_code,
               tb.name AS team_b_name, tb.short_code AS team_b_code
          FROM wc_matches m
          LEFT JOIN wc_teams ta ON ta.id = m.team_a_id
          LEFT JOIN wc_teams tb ON tb.id = m.team_b_id
         WHERE m.discontinue = 'false'
           AND m.status = 'settled'
           AND m.result_source = 'espn_partial'
         ORDER BY m.settled_at DESC";

$stmt = $db->prepare($sql);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
?>
