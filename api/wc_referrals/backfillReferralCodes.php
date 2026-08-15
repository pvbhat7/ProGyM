<?php
/**
 * One-off backfill — generates a unique referral_code for every wc_participants
 * row that doesn't already have one. Safe to run multiple times.
 *
 * Run it ONCE after applying the 2026_06_15_add_referrals.sql migration:
 *   GET https://tavrostechinfo.com/PROGYM/ggs/api/wc_referrals/backfillReferralCodes.php
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';
include_once '../../class/WcReferral.php';

$database = new Database();
$db = $database->getConnection();

$refObj = new WcReferral($db);

$stmt = $db->query("SELECT client_id FROM wc_participants
                    WHERE referral_code IS NULL OR referral_code = ''");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$assigned = 0;
$failed   = array();

foreach ($rows as $r) {
    $cid  = (int)$r['client_id'];
    $code = $refObj->assignCodeIfMissing($cid);
    if ($code) {
        $assigned++;
    } else {
        $failed[] = $cid;
    }
}

echo json_encode(array(
    "scanned"  => count($rows),
    "assigned" => $assigned,
    "failed"   => $failed
));
?>
