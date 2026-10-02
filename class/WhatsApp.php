<?php
/**
 * WhatsApp Cloud API sender.
 *
 * Config + secrets live outside public_html in secure_keys/whatsapp.json:
 *   access_token, phone_number_id, waba_id, api_version, app_secret, verify_token,
 *   enabled         (bool)  — master switch
 *   allowed_numbers (array) — if non-empty, only these numbers (e.g. "9198xxxxxxxx") receive messages
 *
 * Every send is logged to `whatsapp_log`; api/whatsapp/webhook.php updates the
 * status (delivered / read / failed) using the returned message id (wamid).
 */
class WhatsApp {

    const CONFIG_PATH = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/whatsapp.json';

    // Template names — must match the approved templates in WhatsApp Manager
    const TPL_WELCOME        = 'progym_membership_activated';   // UTILITY; 'progym_welcome' got classed MARKETING and isn't delivered
    const TPL_PAYMENT        = 'progym_payment_receipt';
    const TPL_REMINDER       = 'progym_membership_reminder';
    const TPL_PROCOINS       = 'progym_procoins_credited';
    const TPL_BIRTHDAY       = 'progym_birthday';
    const TPL_PHOTO_REMINDER = 'progym_photo_reminder';
    const TPL_APP_LAUNCH     = 'progym_app_launch';

    private static $cfg = null;

    public static function config() {
        if (self::$cfg === null) {
            $cfg = is_readable(self::CONFIG_PATH) ? json_decode(file_get_contents(self::CONFIG_PATH), true) : null;
            self::$cfg = is_array($cfg) ? $cfg : array();
        }
        return self::$cfg;
    }

    /** "98765 43210" / "+91-9876543210" / "09876543210" → "919876543210"; null if unusable. */
    public static function normalizeMobile($mobile) {
        $d = preg_replace('/\D/', '', (string)$mobile);
        if (strlen($d) === 10) return '91' . $d;
        if (strlen($d) === 11 && $d[0] === '0') return '91' . substr($d, 1);
        if (strlen($d) === 12 && substr($d, 0, 2) === '91') return $d;
        return null;
    }

    /**
     * Send an approved template message.
     * Never throws — failures are logged and return false, so a WhatsApp problem
     * can't break the email flow or the API response.
     */
    public static function sendTemplate($db, $type, $clientId, $mobile, $template, array $params = [], $lang = 'en') {
        try {
            $cfg = self::config();
            if (empty($cfg['enabled']) || empty($cfg['access_token']) || empty($cfg['phone_number_id'])) return false;

            $to = self::normalizeMobile($mobile);
            if ($to === null) return false;
            if (!empty($cfg['allowed_numbers']) && !in_array($to, $cfg['allowed_numbers'], true)) return false;

            // Template params may not contain newlines/tabs or 4+ consecutive spaces, and may not be empty
            $clean = [];
            foreach ($params as $p) {
                $p = trim(preg_replace('/\s+/', ' ', (string)$p));
                $clean[] = $p === '' ? '-' : mb_substr($p, 0, 200);
            }

            $payload = [
                'messaging_product' => 'whatsapp',
                'to'                => $to,
                'type'              => 'template',
                'template'          => ['name' => $template, 'language' => ['code' => $lang]],
            ];
            if ($clean) {
                $payload['template']['components'] = [[
                    'type'       => 'body',
                    'parameters' => array_map(function ($t) { return ['type' => 'text', 'text' => $t]; }, $clean),
                ]];
            }

            $version = !empty($cfg['api_version']) ? $cfg['api_version'] : 'v23.0';
            $ch = curl_init("https://graph.facebook.com/{$version}/{$cfg['phone_number_id']}/messages");
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($payload),
                CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $cfg['access_token'], 'Content-Type: application/json'],
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT        => 10,
            ]);
            $raw  = curl_exec($ch);
            $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $cerr = curl_error($ch);
            curl_close($ch);

            $res  = json_decode((string)$raw, true);
            $wamid = isset($res['messages'][0]['id']) ? $res['messages'][0]['id'] : null;

            if ($http === 200 && $wamid) {
                self::log($db, $type, $clientId, $to, $template, $clean, 'sent', $wamid, null);
                return true;
            }
            $err = $cerr ?: (isset($res['error']['message']) ? $res['error']['message'] : "HTTP {$http}: " . substr((string)$raw, 0, 300));
            error_log("WhatsApp {$template} to {$to} failed: {$err}");
            self::log($db, $type, $clientId, $to, $template, $clean, 'failed', null, $err);
            return false;
        } catch (Throwable $e) {
            error_log('WhatsApp error: ' . $e->getMessage());
            return false;
        }
    }

    private static function log($db, $type, $clientId, $mobile, $template, $params, $status, $wamid, $error) {
        try {
            date_default_timezone_set('Asia/Calcutta');
            $db->exec("SET NAMES utf8mb4");
            $stmt = $db->prepare(
                "INSERT INTO whatsapp_log (clientId, mobile, type, template, params, status, wamid, errorMessage, sentAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $clientId ? intval($clientId) : null,
                $mobile,
                $type,
                $template,
                json_encode($params, JSON_UNESCAPED_UNICODE),
                $status,
                $wamid,
                $error ? mb_substr((string)$error, 0, 500) : null,
                date('Y-m-d H:i:s'),
            ]);
        } catch (Throwable $e) {
            error_log('WhatsApp log error: ' . $e->getMessage());
        }
    }
}
