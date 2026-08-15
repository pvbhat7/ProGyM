<?php
/**
 * Admin endpoint — flips wc_participants.converted_to_member_at = NOW()
 * for a client whose row in wc_participants is was_gym_client_at_join='no'.
 *
 * Idempotent: if the client never joined the WC campaign, or was already a
 * gym member, or has already been marked converted, this is a no-op.
 *
 * Intended to be called right after a successful package assignment via the
 * existing admin flow (packageDetails/create.php). Pure conversion telemetry —
 * does NOT touch coins, packages, or anything else.
 *
 * Body: { "client_id": 42 }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';
include_once '../../class/WcParticipant.php';

$database = new Database();
$db = $database->getConnection();

$data      = json_decode(file_get_contents("php://input"), true);
$client_id = isset($data['client_id']) ? (int)$data['client_id'] : 0;
if ($client_id <= 0){
    http_response_code(400);
    echo json_encode(array("message" => "client_id required."));
    exit;
}

$part = new WcParticipant($db);
$existed = $part->existsByClientId($client_id);
$part->markConvertedToMember($client_id);

echo json_encode(array(
    "client_id"             => $client_id,
    "participant_existed"   => $existed,
    "message"               => "Conversion attempt recorded."
));
?>
