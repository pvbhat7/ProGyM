<?php
    // Stamps wc_participants.{sms,whatsapp}_reminder_sent_at = NOW() for a given client.
    // Called by the admin WC Leaderboard page when the admin taps the SMS / WhatsApp button.
    // Payload: { "client_id": 123, "channel": "sms" | "whatsapp" }

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcParticipant.php';

    $database = new Database();
    $db = $database->getConnection();

    $raw = file_get_contents("php://input");
    $data = json_decode($raw);

    $client_id = isset($data->client_id) ? (int)$data->client_id : 0;
    $channel   = isset($data->channel)   ? trim((string)$data->channel) : '';

    $allowed = array('sms', 'whatsapp', 'match_sms', 'match_whatsapp');
    if ($client_id <= 0 || !in_array($channel, $allowed, true)) {
        http_response_code(400);
        echo json_encode(array("ok" => false, "error" => "client_id and channel ('sms' | 'whatsapp' | 'match_sms' | 'match_whatsapp') required"));
        exit;
    }

    $item = new WcParticipant($db);
    $ok = $item->markReminderSent($client_id, $channel);

    if (!$ok) {
        http_response_code(500);
        echo json_encode(array("ok" => false, "error" => "update failed"));
        exit;
    }

    // Read back the timestamps so the client gets the canonical server time.
    $stmt = $db->prepare("SELECT sms_reminder_sent_at, whatsapp_reminder_sent_at,
                                 match_reminder_sms_sent_at, match_reminder_whatsapp_sent_at
                          FROM wc_participants WHERE client_id = :cid");
    $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(array(
        "ok"                              => true,
        "client_id"                       => $client_id,
        "channel"                         => $channel,
        "sms_reminder_sent_at"            => $row ? $row['sms_reminder_sent_at']            : null,
        "whatsapp_reminder_sent_at"       => $row ? $row['whatsapp_reminder_sent_at']       : null,
        "match_reminder_sms_sent_at"      => $row ? $row['match_reminder_sms_sent_at']      : null,
        "match_reminder_whatsapp_sent_at" => $row ? $row['match_reminder_whatsapp_sent_at'] : null
    ));
?>
