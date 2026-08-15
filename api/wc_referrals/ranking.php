<?php
/**
 * GET /api/wc_referrals/ranking.php?limit=100
 *
 * Referral leaderboard. Top 5 win gifts (advertised in the frontend).
 * Ordered by gold_coins desc; tiebreaker: earliest first credited referral.
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';
include_once '../../class/WcReferral.php';

$limit = isset($_GET['limit']) ? max(1, min(500, (int)$_GET['limit'])) : 100;

$database = new Database();
$db = $database->getConnection();

// Gym-admin (Pranav Patil, mobile 8796655176) is hidden from the leaderboard —
// mirrors overall.php + daily.php exclusion so ranks are consistent across tabs.
$excludedIds = array();
$st = $db->prepare("SELECT id FROM client WHERE mobile = ? LIMIT 1");
$st->execute(['8796655176']);
if ($eid = $st->fetchColumn()) $excludedIds[(string)$eid] = true;

$refObj = new WcReferral($db);
$stmt   = $refObj->getRanking($limit);

$rows = array();
$rank = 0;
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
    if (isset($excludedIds[(string)$r['client_id']])) continue;
    $rank++;
    $rows[] = array(
        "rank"              => $rank,
        "client_id"         => (int)$r['client_id'],
        "client_name"       => $r['client_name'],
        "client_photo"      => $r['client_photo'],
        "gold_coins"        => (int)$r['gold_coins'],
        "referrals_count"   => (int)$r['referrals_count'],
        "first_credited_at" => $r['first_credited_at'],
    );
}

echo json_encode(array(
    "limit"       => $limit,
    "count"       => count($rows),
    "leaderboard" => $rows
));
?>
