<?php
/**
 * One-off — credits any wc_referrals rows still sitting in status='pending'
 * (from the older "credit on first prediction" model) by flipping them to
 * credited and bumping the referrer's gold_coins.
 *
 * Safe to run multiple times: only rows still pending get acted on, and the
 * gold_coins update is gated on the row's atomic status flip.
 *
 * Hit it ONCE in your browser:
 *   https://progym.co.in/api/wc_referrals/creditExistingPendings.php
 * (or whichever host serves your APIs)
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';
include_once '../../class/WcReferral.php';

$database = new Database();
$db = $database->getConnection();

$coins_per = WcReferral::COINS_PER_REFERRAL;

$stmt = $db->query("SELECT id, referrer_client_id FROM wc_referrals WHERE status = 'pending'");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$credited = array();
$skipped  = array();

foreach ($rows as $r) {
    $refId      = (int)$r['id'];
    $referrerId = (int)$r['referrer_client_id'];

    try {
        $db->beginTransaction();

        // Atomic flip — only the winner of the race gets to credit.
        $upd = $db->prepare(
            "UPDATE wc_referrals
               SET status = 'credited', credited_at = NOW(), coins_awarded = :coins
             WHERE id = :id AND status = 'pending'"
        );
        $upd->bindValue(':coins', $coins_per, PDO::PARAM_INT);
        $upd->bindValue(':id',    $refId,     PDO::PARAM_INT);
        $upd->execute();

        if ($upd->rowCount() === 0){
            $db->rollBack();
            $skipped[] = $refId;
            continue;
        }

        $cred = $db->prepare(
            "UPDATE wc_participants SET gold_coins = gold_coins + :coins
             WHERE client_id = :cid"
        );
        $cred->bindValue(':coins', $coins_per,  PDO::PARAM_INT);
        $cred->bindValue(':cid',   $referrerId, PDO::PARAM_INT);
        $cred->execute();

        $db->commit();
        $credited[] = array("referral_id" => $refId, "referrer_client_id" => $referrerId);
    } catch (PDOException $e){
        if ($db->inTransaction()) $db->rollBack();
        $skipped[] = $refId;
    }
}

echo json_encode(array(
    "scanned"  => count($rows),
    "credited" => $credited,
    "skipped"  => $skipped,
    "coins_per_referral" => $coins_per
));
?>
