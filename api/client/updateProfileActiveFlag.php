<?php
/**
 * Enable / disable a member profile (Admin → member profile toggle).
 * POST { id: 1381, profileActiveFlag: "enable" | "disable" }
 * Touches only client.profileActiveFlag — unlike client/update.php, which rewrites the whole row.
 *
 * When the status actually changes, the member gets a WhatsApp:
 *   enable  → progym_membership_activated_v3 (TPL_WELCOME)
 *   disable → progym_account_deactivated_v1, falling back to the announcement template
 * → { success, profileActiveFlag, whatsapp: { sent, error } | null }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

date_default_timezone_set('Asia/Calcutta');
include_once '../../config/database.php';
include_once '../../config/mail_config.php';
include_once '../../class/WhatsApp.php';

$data = json_decode(file_get_contents("php://input"), true);
$id   = isset($data['id']) ? intval($data['id']) : 0;
$flag = isset($data['profileActiveFlag']) ? $data['profileActiveFlag'] : '';

if ($id <= 0 || !in_array($flag, ['enable', 'disable'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'id and profileActiveFlag (enable|disable) required']);
    exit;
}

$db = (new Database())->getConnection();

$c = $db->prepare("SELECT name, mobile, profileActiveFlag FROM client WHERE id = ?");
$c->execute([$id]);
$client = $c->fetch(PDO::FETCH_ASSOC);
if (!$client) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Member not found']);
    exit;
}
$changed = $client['profileActiveFlag'] !== $flag;

$s = $db->prepare("UPDATE client SET profileActiveFlag = ? WHERE id = ?");
$s->execute([$flag, $id]);

// Tell the member on WhatsApp — only when the status really changed
$wa = null;
if ($changed) {
    $gym = GYM_NAME . ', ' . GYM_CITY;
    if ($flag === 'enable') {
        $ok = WhatsApp::sendTemplate($db, 'profile_enabled', $id, $client['mobile'], WhatsApp::TPL_WELCOME,
            [$client['name'], $gym]);
    } else {
        $ok = WhatsApp::sendTemplate($db, 'profile_disabled', $id, $client['mobile'], WhatsApp::TPL_ACCOUNT_DEACTIVATED,
            [$client['name'], $gym]);
        if (!$ok) {   // dedicated template still pending Meta review → approved announcement template
            $ok = WhatsApp::sendTemplate($db, 'profile_disabled', $id, $client['mobile'], WhatsApp::TPL_ANNOUNCEMENT,
                [$client['name'], "Your membership account at $gym has been deactivated. You will not be able to use the member app until it is activated again. To reactivate, please renew your membership or contact the gym."]);
        }
    }
    $wa = ['sent' => (bool)$ok, 'error' => $ok ? null : (WhatsApp::$lastError ?: 'WhatsApp not sent')];
}

echo json_encode(['success' => true, 'profileActiveFlag' => $flag, 'whatsapp' => $wa]);
