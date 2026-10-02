<?php
/**
 * WhatsApp Cloud API webhook.
 *
 * GET  — Meta's verification handshake (hub.mode / hub.verify_token / hub.challenge)
 * POST — incoming messages + delivery/read status updates
 *
 * Secrets live outside public_html in secure_keys/whatsapp.json:
 *   { "verify_token": "...", "app_secret": "...", "access_token": "...", "phone_number_id": "..." }
 */

date_default_timezone_set('Asia/Calcutta');

define('WA_CONFIG_PATH', '/home/u636480992/domains/tavrostechinfo.com/secure_keys/whatsapp.json');
define('WA_LOG_PATH',    '/home/u636480992/domains/tavrostechinfo.com/secure_keys/whatsapp_webhook.log');

function wa_config() {
    if (!is_readable(WA_CONFIG_PATH)) {
        return array();
    }
    $cfg = json_decode(file_get_contents(WA_CONFIG_PATH), true);
    return is_array($cfg) ? $cfg : array();
}

function wa_log($line) {
    @file_put_contents(WA_LOG_PATH, '[' . date('d-m-Y h:i:s') . '] ' . $line . "\n", FILE_APPEND);
}

/** Update whatsapp_log by message id; never downgrades (e.g. a late 'delivered' after 'read'). */
function wa_update_status($wamid, $status, $error) {
    try {
        include_once __DIR__ . '/../../config/database.php';
        $db = (new Database())->getConnection();
        if ($status === 'failed') {
            $stmt = $db->prepare("UPDATE whatsapp_log SET status = 'failed', errorMessage = ?, updatedAt = ? WHERE wamid = ?");
            $stmt->execute([$error, date('Y-m-d H:i:s'), $wamid]);
        } else {
            $stmt = $db->prepare(
                "UPDATE whatsapp_log SET status = ?, updatedAt = ?
                 WHERE wamid = ? AND FIELD(status, 'sent', 'delivered', 'read') < FIELD(?, 'sent', 'delivered', 'read')"
            );
            $stmt->execute([$status, date('Y-m-d H:i:s'), $wamid, $status]);
        }
    } catch (Throwable $e) {
        wa_log('DB status update failed: ' . $e->getMessage());
    }
}

$cfg = wa_config();

// ---- Verification handshake ----
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // PHP converts dots in query keys to underscores: hub.mode -> hub_mode
    $mode      = isset($_GET['hub_mode']) ? $_GET['hub_mode'] : '';
    $token     = isset($_GET['hub_verify_token']) ? $_GET['hub_verify_token'] : '';
    $challenge = isset($_GET['hub_challenge']) ? $_GET['hub_challenge'] : '';

    if ($mode === 'subscribe' && !empty($cfg['verify_token']) && hash_equals($cfg['verify_token'], $token)) {
        wa_log('Webhook verified');
        header('Content-Type: text/plain');
        echo $challenge;
        exit;
    }
    wa_log('Webhook verification FAILED (mode=' . $mode . ')');
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

// ---- Event notifications ----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');

    // Validate Meta's signature when app_secret is configured
    if (!empty($cfg['app_secret'])) {
        $sig      = isset($_SERVER['HTTP_X_HUB_SIGNATURE_256']) ? $_SERVER['HTTP_X_HUB_SIGNATURE_256'] : '';
        $expected = 'sha256=' . hash_hmac('sha256', $raw, $cfg['app_secret']);
        if (!hash_equals($expected, $sig)) {
            wa_log('Rejected POST: bad signature');
            http_response_code(403);
            exit;
        }
    }

    $data = json_decode($raw, true);
    if (isset($data['entry']) && is_array($data['entry'])) {
        foreach ($data['entry'] as $entry) {
            if (empty($entry['changes'])) continue;
            foreach ($entry['changes'] as $change) {
                $value = isset($change['value']) ? $change['value'] : array();

                if (!empty($value['messages'])) {
                    foreach ($value['messages'] as $msg) {
                        $text = isset($msg['text']['body']) ? $msg['text']['body'] : '(' . $msg['type'] . ')';
                        wa_log('MSG from ' . $msg['from'] . ': ' . $text);
                    }
                }
                if (!empty($value['statuses'])) {
                    foreach ($value['statuses'] as $st) {
                        $errTitle = isset($st['errors'][0]['title']) ? $st['errors'][0]['title'] : null;
                        wa_log('STATUS ' . $st['status'] . ' to ' . $st['recipient_id'] . ' id=' . $st['id'] . ($errTitle ? ' error=' . $errTitle : ''));
                        wa_update_status($st['id'], $st['status'], $errTitle);
                    }
                }
            }
        }
    } else {
        wa_log('Unrecognised POST: ' . substr($raw, 0, 500));
    }

    // Meta retries unless it gets a 200 quickly
    http_response_code(200);
    echo 'EVENT_RECEIVED';
    exit;
}

http_response_code(405);
