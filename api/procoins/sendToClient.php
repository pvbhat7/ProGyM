<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

include_once '../../config/database.php';
include_once '../../class/ProCoinEmail.php';

$database = new Database();
$db = $database->getConnection();

$data        = json_decode(file_get_contents("php://input"));
$clientId    = intval($data->clientId ?? 0);
$amount      = intval($data->amount ?? 0);
$description = trim($data->description ?? 'ProCoin Gift from Admin');
$isBirthday  = !empty($data->isBirthday);
// Birthday "App" mode: admin sends the wish from their own WhatsApp — skip the API message
$whatsappApi = !isset($data->whatsappApi) || !empty($data->whatsappApi);

if ($clientId <= 0 || $amount <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid clientId or amount']);
    exit;
}

$today = date('d/m/Y');
$txnId = 'ADMIN-GIFT-' . $clientId . '-' . date('YmdHis');

$s1 = $db->prepare(
    "INSERT INTO rewards (clientId, title, subTitle, img, amount, isRedeemed, creditDebit, redeemDate)
     VALUES (?, 'Admin Gift', ?, '', ?, 'false', '1', '')"
);
$s1->execute([$clientId, $description, $amount]);

$s2 = $db->prepare(
    "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
     VALUES (?, ?, ?, '1', ?, ?)"
);
$s2->execute([$txnId, $description, $amount, $today, $clientId]);

$emailed = $isBirthday
    ? ProCoinEmail::sendBirthdayGift($db, $clientId, $amount, $whatsappApi)
    : ProCoinEmail::sendGift($db, $clientId, $amount, $description);

echo json_encode(['success' => true, 'emailed' => $emailed]);
?>
