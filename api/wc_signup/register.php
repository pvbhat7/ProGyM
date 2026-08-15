<?php
/**
 * Public endpoint — registers a person for the World Cup prediction campaign.
 *
 * Behavior:
 *   - If mobile already exists in `client`: returns that existing client_id (auto-login)
 *   - If mobile doesn't exist: creates a new `client` row with isGymClient='no'
 *     and creationSource='wc_campaign', then awards the standard 100 ProCoin
 *     welcome bonus.
 *   - Either way: ensures a `wc_participants` row exists for that client.
 *
 * NOTE: OTP verification happens on the FRONTEND via Firebase before calling
 * this endpoint, so we trust that this request represents a verified phone.
 *
 * Body:
 *   { "name": "Vinayak", "mobile": "9876543210" }
 *
 * Response (200):
 *   {
 *     "client_id": 1234,
 *     "name": "Vinayak",
 *     "is_new_account": true,         // false if pre-existing client
 *     "was_gym_client_at_join": "no", // 'yes' if existing gym member
 *     "welcome_bonus_awarded": true
 *   }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';
include_once '../../class/WcParticipant.php';
include_once '../../class/WcReferral.php';

$database = new Database();
$db = $database->getConnection();

$data            = json_decode(file_get_contents("php://input"), true);
$name            = isset($data['name'])              ? trim($data['name'])              : '';
$mobile          = isset($data['mobile'])            ? trim($data['mobile'])            : '';
$referred_by_raw = isset($data['referred_by_code']) ? trim($data['referred_by_code'])  : '';

// Basic validation: mobile must be 10 digits (India), name non-empty
if (!preg_match('/^\d{10}$/', $mobile)){
    http_response_code(400);
    echo json_encode(array("message" => "mobile must be a 10-digit Indian number."));
    exit;
}
if ($name === ''){
    http_response_code(400);
    echo json_encode(array("message" => "name is required."));
    exit;
}

// ----- 1) Look up existing active client by mobile -----
$stmt = $db->prepare("SELECT id, name, isGymClient FROM client WHERE mobile = ? AND discontinue != 'true' LIMIT 1");
$stmt->execute(array($mobile));
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

$client_id            = 0;
$is_new_account       = false;
$welcome_bonus_awarded = false;
$was_gym_client_at_join = 'no';
$resolved_name        = $name;

if ($existing){
    // Mobile already known. Use that account. Their existing isGymClient flag wins.
    $client_id              = (int)$existing['id'];
    $resolved_name          = $existing['name'] ?: $name;
    $was_gym_client_at_join = (strtolower(trim($existing['isGymClient'])) === 'yes') ? 'yes' : 'no';
} else {
    // ----- 2) Create a new lightweight non-member client -----
    $admDate = date("d/m/Y");
    $insertClient = $db->prepare(
        "INSERT INTO client
         SET name = ?, admissionDate = ?, mobile = ?,
             photo = '', profileActiveFlag = 'enable',
             isGymClient = 'no', creationSource = 'wc_campaign',
             discontinue = 'false', referPoints = '',
             gender = '', birthDate = '', email = '', address = '',
             bloodGroup = '', reference = '', remarks = '', previousGym = '',
             height = 0, weight = 0, adp = '', awp = '',
             isPTClient = 'no', occupation = ''"
    );
    $ok = $insertClient->execute(array($name, $admDate, $mobile));
    if (!$ok){
        http_response_code(500);
        echo json_encode(array("message" => "Could not create client."));
        exit;
    }
    $client_id              = (int)$db->lastInsertId();
    $is_new_account         = true;
    $was_gym_client_at_join = 'no';

    // Standard 100 ProCoin welcome bonus (matches existing convention from createClientWeb.php)
    $dt = date("d M Y");
    $db->prepare("INSERT INTO rewards (title, amount, isRedeemed, redeemDate, clientId) VALUES ('Signup Welcome Bonus','100','false',?,?)")
       ->execute(array($dt, $client_id));
    $db->prepare("INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId) VALUES (?, 'Signup Welcome Bonus','100','1',?,?)")
       ->execute(array('WC-WELCOME-' . $client_id . '-' . date('YmdHis'), date('d/m/Y'), $client_id));
    $welcome_bonus_awarded = true;
}

// ----- 3) Register as campaign participant (idempotent — INSERT IGNORE) -----
//
// Capture "was this client already a wc_participant?" BEFORE the upsert. Used
// below to gate referral credit: a returning user who logs back in and types
// in a code on the form must NOT credit anyone — only first-time wc2026 joins do.
$partObj = new WcParticipant($db);
$was_already_wc_participant = $partObj->existsByClientId($client_id);

$source = ($was_gym_client_at_join === 'yes') ? 'existing_member' : 'non_member_signup';
$partObj->registerParticipant($client_id, $source, $was_gym_client_at_join);

// ----- 4) Ensure this participant has a referral_code (generated on first join) -----
$refObj  = new WcReferral($db);
$my_code = $refObj->assignCodeIfMissing($client_id);

// ----- 5) Record referral (if a valid code was supplied AND this is a first-time join) -----
//
// Rules:
//   - This signup must be a FIRST-TIME wc2026 join. Returning users (who already
//     had a wc_participants row before this call) cannot trigger a credit, even
//     if they paste a code into the signup form on a subsequent login attempt.
//   - Code must resolve to an existing participant.
//   - Cannot refer yourself.
//   - The referee (this client) must not already be the referred party in any
//     prior wc_referrals row (UNIQUE on referred_client_id enforces this).
//   - Existing gym membership does NOT by itself block referral attribution —
//     only prior wc2026 participation does (per product spec).
$referral_recorded = false;
$referral_message  = null;
if ($referred_by_raw !== ''){
    if ($was_already_wc_participant){
        $referral_message = "Referral codes only count for first-time campaign signups.";
    } else {
        $referrer = $refObj->findByCode($referred_by_raw);
        if (!$referrer){
            $referral_message = "Referral code not recognised.";
        } else if ((int)$referrer['client_id'] === $client_id){
            $referral_message = "You can't refer yourself.";
        } else {
            $existing = $refObj->getByReferred($client_id);
            if ($existing){
                $referral_message = "This account has already been referred.";
            } else {
                $credit = $refObj->recordReferralAndCredit((int)$referrer['client_id'], $client_id);
                if ($credit){
                    $referral_recorded = true;
                } else {
                    $referral_message = "Could not record referral.";
                }
            }
        }
    }
}

echo json_encode(array(
    "client_id"              => $client_id,
    "name"                   => $resolved_name,
    "mobile"                 => $mobile,
    "is_new_account"         => $is_new_account,
    "was_gym_client_at_join" => $was_gym_client_at_join,
    "welcome_bonus_awarded"  => $welcome_bonus_awarded,
    "referral_code"          => $my_code ?: null,
    "referral_recorded"      => $referral_recorded,
    "referral_message"       => $referral_message
));
?>
