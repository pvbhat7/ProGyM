<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

set_time_limit(120);
ignore_user_abort(true);

include_once '../../config/database.php';
include_once '../../class/ProCoinEmail.php';

$database = new Database();
$db = $database->getConnection();

$data        = json_decode(file_get_contents("php://input"));
$campaignId  = trim($data->campaignId ?? '');
if ($campaignId === '') {
    http_response_code(400);
    echo json_encode(['error' => 'campaignId is required']);
    exit;
}

$bonusAmount = intval($data->amount ?? 100);
if ($bonusAmount <= 0) $bonusAmount = 100;
$title    = trim($data->title ?? 'Loyalty Appreciation Bonus');
if ($title === '') $title = 'Loyalty Appreciation Bonus';
$subTitle = trim($data->subTitle ?? 'A special thank-you for being part of the ProGym family!');
if ($subTitle === '') $subTitle = 'A special thank-you for being part of the ProGym family!';
$des      = trim($data->description ?? ($title . ' — ' . $bonusAmount . ' ProCoins gifted to all ProGym members'));
if ($des === '') $des = $title . ' — ' . $bonusAmount . ' ProCoins gifted to all ProGym members';
$offset   = max(0, intval($data->offset ?? 0));
$limit    = max(1, min(100, intval($data->limit ?? 50)));
$today    = date('d/m/Y');

$totalStmt = $db->query("SELECT COUNT(*) FROM client");
$total = intval($totalStmt->fetchColumn());

$stmt = $db->prepare("SELECT id FROM client LIMIT ? OFFSET ?");
$stmt->bindValue(1, $limit, PDO::PARAM_INT);
$stmt->bindValue(2, $offset, PDO::PARAM_INT);
$stmt->execute();
$clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

$credited = 0;
$emailed  = 0;
$skipped  = 0;

$checkByTxnId  = $db->prepare("SELECT id FROM procointransaction WHERE txnId = ? LIMIT 1");
// Catches re-runs after partial failure regardless of txnId format — same amount + same description + same date
$checkByContent = $db->prepare("SELECT id FROM procointransaction WHERE clientId = ? AND txnDate = ? AND amount = ? AND des = ? LIMIT 1");

foreach ($clients as $client) {
    $cid   = intval($client['id']);
    $txnId = $campaignId . '-' . $cid;

    // Skip if already credited in this campaign (new BULK-xxx-cid format)
    $checkByTxnId->execute([$txnId]);
    if ($checkByTxnId->fetch()) {
        $skipped++;
        continue;
    }

    // Skip if already credited today with identical amount + description (catches old LAB-cid-timestamp format re-runs)
    $checkByContent->execute([$cid, $today, $bonusAmount, $des]);
    if ($checkByContent->fetch()) {
        $skipped++;
        continue;
    }

    try {
        $db->beginTransaction();

        $s1 = $db->prepare(
            "INSERT INTO rewards (clientId, title, subTitle, img, amount, isRedeemed, creditDebit, redeemDate)
             VALUES (?, ?, ?, '', ?, 'false', '1', '')"
        );
        $s1->execute([$cid, $title, $subTitle, $bonusAmount]);

        $s2 = $db->prepare(
            "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
             VALUES (?, ?, ?, '1', ?, ?)"
        );
        $s2->execute([$txnId, $des, $bonusAmount, $today, $cid]);

        $db->commit();
        $credited++;
    } catch (Exception $e) {
        $db->rollBack();
        $skipped++;
        continue;
    }

    if (ProCoinEmail::sendBonus($db, $cid, $bonusAmount, $title)) $emailed++;
}

$nextOffset = $offset + count($clients);

echo json_encode([
    'credited'   => $credited,
    'emailed'    => $emailed,
    'skipped'    => $skipped,
    'total'      => $total,
    'nextOffset' => $nextOffset,
    'done'       => ($nextOffset >= $total),
]);
?>
