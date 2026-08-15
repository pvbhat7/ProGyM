<?php
/**
 * GET /api/wc_referrals/info.php?client_id=123
 *
 * Returns the caller's referral code, current gold-coin balance, the share
 * link, the count of credited & pending referrals, and the per-referee list.
 *
 * Auto-generates the referral code if missing (in case the participant row
 * existed before the migration but wasn't backfilled).
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';
include_once '../../class/WcReferral.php';

$client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
if ($client_id <= 0){
    http_response_code(400);
    echo json_encode(array("message" => "client_id is required."));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$refObj = new WcReferral($db);

// Lazy-generate the code if not present yet.
$code = $refObj->assignCodeIfMissing($client_id);

$stmt = $db->prepare(
    "SELECT wp.referral_code, wp.gold_coins,
            c.name AS client_name
     FROM wc_participants wp
     LEFT JOIN client c ON c.id = wp.client_id
     WHERE wp.client_id = :cid"
);
$stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
$stmt->execute();
$me = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$me){
    http_response_code(404);
    echo json_encode(array("message" => "Participant not found."));
    exit;
}

$referrals = $refObj->listForReferrer($client_id);
$credited  = 0;
$pending   = 0;
foreach ($referrals as $r){
    if ($r['status'] === 'credited') $credited++;
    else $pending++;
}

// Build share link — campaign sub-app lives under /wc2026/ on the new domain
$share_link = 'https://progym.co.in/wc2026/?ref=' . urlencode((string)($me['referral_code'] ?? ''));

echo json_encode(array(
    "client_id"     => $client_id,
    "referral_code" => $me['referral_code'],
    "gold_coins"    => (int)$me['gold_coins'],
    "share_link"    => $share_link,
    "credited"      => $credited,
    "pending"       => $pending,
    "coins_per_referral" => WcReferral::COINS_PER_REFERRAL,
    "referrals"     => $referrals
));
?>
