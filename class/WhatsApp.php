<?php
/**
 * WhatsApp Cloud API sender.
 *
 * Config + secrets live outside public_html in secure_keys/whatsapp.json:
 *   access_token, phone_number_id, waba_id, api_version, app_secret, verify_token,
 *   api_base        (string, optional) — API gateway, default https://graph.facebook.com (see apiUrl())
 *   enabled         (bool)  — master switch
 *   allowed_numbers (array) — if non-empty, only these numbers (e.g. "9198xxxxxxxx") receive messages
 *
 * Every send is logged to `whatsapp_log`; api/whatsapp/webhook.php updates the
 * status (delivered / read / failed) using the returned message id (wamid).
 */
class WhatsApp {

    const CONFIG_PATH = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/whatsapp.json';

    // Template names — must match the approved templates in the PRO GYM WhatsApp account.
    // _v3 suffixes: earlier names were deleted by a connected third-party tool and Meta
    // locks a deleted name for 4 weeks.
    const TPL_WELCOME        = 'progym_membership_activated_v3';
    const TPL_PAYMENT        = 'progym_payment_receipt_v3';
    const TPL_PAYMENT_PDF    = 'progym_payment_receipt_pdf';      // same body as TPL_PAYMENT + DOCUMENT header (receipt PDF)
    const TPL_REMINDER       = 'progym_membership_reminder_v3';
    const TPL_PROCOINS       = 'progym_procoins_credited_v3';
    const TPL_BIRTHDAY       = 'progym_birthday_v3';
    const TPL_PHOTO_REMINDER = 'progym_photo_reminder_v3';
    const TPL_APP_LAUNCH     = 'progym_app_launch_v3';
    const TPL_ATTENDANCE     = 'progym_attendance_alert_v3';     // {{1}} member name, {{2}} time, {{3}} date
    const TPL_SIGNUP_ALERT   = 'progym_signup_alert_v1';         // UTILITY staff alert; {{1}} name, {{2}} mobile, {{3}} via, {{4}} date+time
    const TPL_ACCOUNT_DEACTIVATED = 'progym_account_deactivated_v1'; // UTILITY; {{1}} name, {{2}} gym
    const TPL_PAYMENT_LINK   = 'progym_payment_link';            // UTILITY; {{1}} name, {{2}} gym, {{3}} amount, {{4}} for, {{5}} url, {{6}} days valid
    const TPL_PAYMENT_LINK_BTN = 'progym_payment_link_btn';      // UTILITY; {{1}} name, {{2}} gym, {{3}} amount, {{4}} for, {{5}} days; URL button https://rzp.io/{{1}}
    const TPL_ANNOUNCEMENT       = 'progym_announcement';         // MARKETING; {{1}} name, {{2}} admin's text
    const TPL_ANNOUNCEMENT_IMAGE = 'progym_announcement_image';   // same body + IMAGE header

    private static $cfg = null;

    /** Result details of the most recent sendTemplate() call. */
    public static $lastWamid = null;
    public static $lastError = null;

    public static function config() {
        if (self::$cfg === null) {
            $cfg = is_readable(self::CONFIG_PATH) ? json_decode(file_get_contents(self::CONFIG_PATH), true) : null;
            self::$cfg = is_array($cfg) ? $cfg : array();
        }
        return self::$cfg;
    }

    /**
     * Full Cloud API URL for $path, e.g. apiUrl('123/messages') → https://graph.facebook.com/v23.0/123/messages.
     * Config 'api_base' switches the gateway (default Meta; Tavros Connect = https://tavrosconnect.com),
     * 'api_version' the Graph version (default v23.0). Every WhatsApp API call must go through this.
     */
    public static function apiUrl($path) {
        $cfg     = self::config();
        $base    = !empty($cfg['api_base']) ? $cfg['api_base'] : 'https://graph.facebook.com';
        $version = !empty($cfg['api_version']) ? $cfg['api_version'] : 'v23.0';
        return rtrim($base, '/') . '/' . $version . '/' . ltrim($path, '/');
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
    public static function sendTemplate($db, $type, $clientId, $mobile, $template, array $params = [], $lang = 'en', $headerImageUrl = null, $headerDocument = null, $buttonUrlSuffix = null) {
        self::$lastWamid = null;
        self::$lastError = null;
        try {
            $cfg = self::config();
            if (empty($cfg['enabled']) || empty($cfg['access_token']) || empty($cfg['phone_number_id'])) {
                self::$lastError = 'WhatsApp is disabled or not configured';
                return false;
            }

            $to = self::normalizeMobile($mobile);
            if ($to === null) { self::$lastError = 'No valid mobile number'; return false; }
            if (!empty($cfg['allowed_numbers']) && !in_array($to, $cfg['allowed_numbers'], true)) {
                self::$lastError = 'Number not in allowed_numbers (test mode)';
                return false;
            }

            // Template params may not contain newlines/tabs or 4+ consecutive spaces, and may not be empty
            $clean = [];
            foreach ($params as $p) {
                $p = trim(preg_replace('/\s+/', ' ', (string)$p));
                $clean[] = $p === '' ? '-' : mb_substr($p, 0, 900);
            }

            $payload = [
                'messaging_product' => 'whatsapp',
                'to'                => $to,
                'type'              => 'template',
                'template'          => ['name' => $template, 'language' => ['code' => $lang]],
            ];
            $components = [];
            if ($headerImageUrl) {
                $components[] = ['type' => 'header', 'parameters' => [['type' => 'image', 'image' => ['link' => $headerImageUrl]]]];
            } elseif ($headerDocument) {
                // ['id' => uploaded media id, 'filename' => shown to the member]
                $components[] = ['type' => 'header', 'parameters' => [['type' => 'document', 'document' => $headerDocument]]];
            }
            if ($clean) {
                $components[] = [
                    'type'       => 'body',
                    'parameters' => array_map(function ($t) { return ['type' => 'text', 'text' => $t]; }, $clean),
                ];
            }
            if ($buttonUrlSuffix !== null) {
                // Dynamic URL button (index 0): template URL is e.g. "https://rzp.io/{{1}}"
                $components[] = ['type' => 'button', 'sub_type' => 'url', 'index' => '0',
                                 'parameters' => [['type' => 'text', 'text' => (string)$buttonUrlSuffix]]];
            }
            if ($components) $payload['template']['components'] = $components;

            $headers = ['Authorization: Bearer ' . $cfg['access_token'], 'Content-Type: application/json'];
            $nameHeader = self::contactNameHeader($db, $cfg, $clientId, $to);
            if ($nameHeader !== null) $headers[] = $nameHeader;

            $ch = curl_init(self::apiUrl($cfg['phone_number_id'] . '/messages'));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($payload),
                CURLOPT_HTTPHEADER     => $headers,
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
                self::$lastWamid = $wamid;
                return true;
            }
            $err = $cerr ?: (isset($res['error']['message']) ? $res['error']['message'] : "HTTP {$http}: " . substr((string)$raw, 0, 300));
            error_log("WhatsApp {$template} to {$to} failed: {$err}");
            self::log($db, $type, $clientId, $to, $template, $clean, 'failed', null, $err);
            self::$lastError = $err;
            return false;
        } catch (Throwable $e) {
            error_log('WhatsApp error: ' . $e->getMessage());
            self::$lastError = $e->getMessage();
            return false;
        }
    }

    /**
     * Tavros Connect only: 'X-Contact-Name' header so the gateway's Chats show the member's name.
     * Added only when the recipient IS that client — staff alerts (attendance, sign-up) carry the
     * member's clientId but go to staff numbers, and must not label the staff chat with the member.
     * Returns null when not applicable; never throws (sending must not depend on it).
     */
    private static function contactNameHeader($db, $cfg, $clientId, $to) {
        try {
            if (empty($cfg['api_base']) || stripos($cfg['api_base'], 'tavrosconnect') === false) return null;
            if (intval($clientId) <= 0 || !($db instanceof PDO)) return null;
            $s = $db->prepare("SELECT name, mobile FROM client WHERE id = ? LIMIT 1");
            $s->execute([intval($clientId)]);
            $c = $s->fetch(PDO::FETCH_ASSOC);
            if (!$c || self::normalizeMobile($c['mobile']) !== $to) return null;
            $name = trim((string)$c['name']);
            return $name === '' ? null : 'X-Contact-Name: ' . rawurlencode($name);
        } catch (Throwable $e) {
            error_log('WhatsApp contact-name lookup failed: ' . $e->getMessage());
            return null;
        }
    }

    /** Membership/dues reminder for the client's latest package. */
    public static function reminder($db, $clientId) {
        $s = $db->prepare("SELECT name, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([intval($clientId)]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client) return false;

        $s = $db->prepare(
            "SELECT pd.id, pd.fees, pd.startDate, pd.endDate,
                    COALESCE(NULLIF(p.description,''), pd.description, 'Membership') AS packageName
             FROM packagedetails pd
             LEFT JOIN packages p ON p.id = pd.packageId
             WHERE pd.clientId = ? AND pd.discontinue = 'false'
             ORDER BY pd.id DESC LIMIT 1"
        );
        $s->execute([intval($clientId)]);
        $pkg = $s->fetch(PDO::FETCH_ASSOC);
        if (!$pkg) return false;

        $s = $db->prepare("SELECT COALESCE(SUM(feesPaid), 0) FROM paymenttransaction WHERE packageDetailsId = ? AND discontinue = 'false'");
        $s->execute([$pkg['id']]);
        $remaining = max(0, floatval($pkg['fees']) - floatval($s->fetchColumn()));

        date_default_timezone_set('Asia/Calcutta');
        $endDate  = DateTime::createFromFormat('d/m/Y', $pkg['endDate']);
        $today    = new DateTime(); $today->setTime(0, 0, 0);
        $daysLeft = $endDate ? intval($today->diff($endDate)->days * ($endDate >= $today ? 1 : -1)) : null;
        if ($daysLeft === null)  $status = 'Membership update';
        elseif ($daysLeft < 0)   $status = 'Membership expired ' . abs($daysLeft) . ' day(s) ago';
        elseif ($daysLeft === 0) $status = 'Membership expires today';
        else                     $status = "Membership expires in {$daysLeft} day(s)";

        return self::sendTemplate($db, 'reminder', $clientId, $client['mobile'], self::TPL_REMINDER, [
            $client['name'], self::gymLabel(), $pkg['packageName'], $pkg['startDate'], $pkg['endDate'],
            $status, $remaining > 0 ? 'Rs.' . number_format($remaining, 0) . ' pending' : 'Fully paid',
        ]);
    }

    /**
     * Payment receipt for one transaction; balance is as it stood right after that payment.
     * Sends the PDF-receipt template first; falls back to the text-only receipt if the PDF
     * can't be made/uploaded or the PDF template isn't approved yet.
     */
    public static function paymentReceiptForTxn($db, $txnId) {
        require_once __DIR__ . '/ReceiptPdf.php';
        $t = ReceiptPdf::data($db, $txnId);
        if (!$t) return false;

        $params = [
            $t['name'],
            number_format($t['paidNow'], 0),
            $t['packageName'],
            $t['paymentDate'],
            $t['balance'] <= 0 ? 'Fully paid' : 'Balance: Rs.' . number_format($t['balance'], 0),
            self::gymLabel(),
        ];

        $pdf = ReceiptPdf::build($db, $txnId);
        if ($pdf !== null) {
            $filename = ReceiptPdf::filename($txnId);
            $mediaId  = self::uploadMedia($pdf, $filename, 'application/pdf');
            if ($mediaId && self::sendTemplate($db, 'payment', $t['clientId'], $t['mobile'], self::TPL_PAYMENT_PDF,
                    $params, 'en', null, ['id' => $mediaId, 'filename' => $filename])) {
                return true;
            }
        }
        return self::sendTemplate($db, 'payment', $t['clientId'], $t['mobile'], self::TPL_PAYMENT, $params);
    }

    /** Upload a file to WhatsApp media storage (kept 30 days); returns the media id or null. */
    public static function uploadMedia($bytes, $filename, $mime) {
        $tmp = null;
        try {
            $cfg = self::config();
            if (empty($cfg['enabled']) || empty($cfg['access_token']) || empty($cfg['phone_number_id'])) return null;

            $tmp = tempnam(sys_get_temp_dir(), 'wam');
            file_put_contents($tmp, $bytes);

            $ch = curl_init(self::apiUrl($cfg['phone_number_id'] . '/media'));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => [
                    'messaging_product' => 'whatsapp',
                    'type'              => $mime,
                    'file'              => new CURLFile($tmp, $mime, $filename),
                ],
                CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $cfg['access_token']],
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT        => 20,
            ]);
            $raw = curl_exec($ch);
            curl_close($ch);
            $res = json_decode((string)$raw, true);
            if (!empty($res['id'])) return $res['id'];
            error_log('WhatsApp media upload failed: ' . substr((string)$raw, 0, 300));
            return null;
        } catch (Throwable $e) {
            error_log('WhatsApp media upload error: ' . $e->getMessage());
            return null;
        } finally {
            if ($tmp && is_file($tmp)) @unlink($tmp);
        }
    }

    /** Razorpay payment link created by admin (api/razorpay/createLink.php). */
    public static function paymentLink($db, $clientId, $mobile, $name, $amount, $description, $url, $days) {
        // Preferred: link on a "Pay now" button (Razorpay short URLs are https://rzp.io/...)
        $prefix = 'https://rzp.io/';
        if (strpos($url, $prefix) === 0) {
            return self::sendTemplate($db, 'payment_link', $clientId, $mobile, self::TPL_PAYMENT_LINK_BTN, [
                $name, self::gymLabel(), number_format(floatval($amount), 0), $description, (string)$days,
            ], 'en', null, null, substr($url, strlen($prefix)));
        }
        return self::sendTemplate($db, 'payment_link', $clientId, $mobile, self::TPL_PAYMENT_LINK, [
            $name, self::gymLabel(), number_format(floatval($amount), 0), $description, $url, (string)$days,
        ]);
    }

    private static function gymLabel() {
        return defined('GYM_NAME') ? GYM_NAME . ', ' . GYM_CITY : 'Pro Gym, Kolhapur';
    }

    /**
     * Member checked in → alert the contacts chosen in Admin → Settings, over WhatsApp
     * and/or push. Kept here as the entry point the check-in endpoints already call.
     */
    public static function attendanceAlert($db, $clientId) {
        require_once __DIR__ . '/AttendanceAlert.php';
        AttendanceAlert::send($db, $clientId);
    }

    /** Finish the HTTP response so slow work (WhatsApp calls) doesn't delay the client. */
    public static function finishResponse() {
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
        elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
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
