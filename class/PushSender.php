<?php
/**
 * ProGym Web Push sender — Firebase Cloud Messaging HTTP v1.
 *
 * Same Firebase project / service account as wc2026 (`progym-web`), but its
 * own token table (push_tokens) and its own access-token cache file, so the
 * two apps stay independent.
 *
 * Messages are sent DATA-ONLY. The service worker
 * (webapp/public/push/firebase-messaging-sw.js) builds the visible
 * notification itself, which lets us:
 *   - show the image (Chrome/Edge on Android + Windows),
 *   - resolve relative links against whichever domain the app is served from
 *     (progym.co.in or tavrostechinfo.com/progym),
 *   - avoid the "two notifications" bug.
 *
 * Tokens are sent in parallel batches with curl_multi so a broadcast to a few
 * hundred devices finishes in seconds rather than minutes.
 */

class PushSender {

    const SERVICE_ACCOUNT_PATH = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/progym-web-firebase-adminsdk-fbsvc-9ee471a708.json';
    const ACCESS_TOKEN_CACHE   = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/progym_push_access_token.cache';
    const FCM_ENDPOINT_TPL     = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';
    const OAUTH_TOKEN_URL      = 'https://oauth2.googleapis.com/token';
    const TOKEN_LIFETIME_SEC   = 3300;  // Google issues 60-min tokens, keep margin
    const BATCH_SIZE           = 50;    // parallel requests per curl_multi round
    const PUSH_TTL_SEC         = 86400; // drop the push if device is offline > 1 day

    /**
     * Send one notification to many devices.
     *
     * @param PDO    $db
     * @param array  $devices list of push_tokens rows: ['id' => .., 'token' => ..]
     * @param array  $data    string map: title, body, image, link, nid ...
     *                        Each device also gets 'tid' (its push_tokens.id) so
     *                        the service worker can post delivery receipts.
     * @return array ['sent' => int, 'failed' => int, 'deactivated' => int,
     *                'results' => [tokenId => ['ok' => bool, 'error' => string|null]]]
     */
    public static function sendToTokens(PDO $db, $devices, $data) {
        $result = array('sent' => 0, 'failed' => 0, 'deactivated' => 0, 'results' => array());
        if (empty($devices)) return $result;

        $accessToken = self::getAccessToken();
        $url = sprintf(self::FCM_ENDPOINT_TPL, self::loadProjectId());

        // FCM requires string-only data values.
        $dataString = array();
        foreach ((array)$data as $k => $v) {
            if ($v === null) continue;
            $dataString[$k] = is_scalar($v) ? (string)$v : json_encode($v);
        }

        foreach (array_chunk($devices, self::BATCH_SIZE) as $chunk) {
            $mh = curl_multi_init();
            $handles = array();
            foreach ($chunk as $dev) {
                $tk = $dev['token'];
                $message = array(
                    'message' => array(
                        'token'   => $tk,
                        'data'    => array_merge($dataString, array('tid' => (string)$dev['id'])),
                        'webpush' => array(
                            'headers' => array(
                                'Urgency' => 'high',
                                'TTL'     => (string)self::PUSH_TTL_SEC,
                            ),
                        ),
                    ),
                );
                $ch = curl_init($url);
                curl_setopt_array($ch, array(
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST           => true,
                    CURLOPT_POSTFIELDS     => json_encode($message),
                    CURLOPT_HTTPHEADER     => array(
                        'Authorization: Bearer ' . $accessToken,
                        'Content-Type: application/json; charset=UTF-8',
                    ),
                    CURLOPT_TIMEOUT        => 15,
                ));
                curl_multi_add_handle($mh, $ch);
                $handles[] = array('ch' => $ch, 'token' => $tk, 'id' => $dev['id']);
            }

            do {
                $status = curl_multi_exec($mh, $running);
                if ($running) curl_multi_select($mh, 1.0);
            } while ($running && $status === CURLM_OK);

            foreach ($handles as $h) {
                $resp = curl_multi_getcontent($h['ch']);
                $http = curl_getinfo($h['ch'], CURLINFO_HTTP_CODE);
                $cerr = curl_error($h['ch']);
                curl_multi_remove_handle($mh, $h['ch']);
                curl_close($h['ch']);

                if ($http >= 200 && $http < 300) {
                    $result['sent']++;
                    $result['results'][$h['id']] = array('ok' => true, 'error' => null);
                    continue;
                }
                $result['failed']++;
                $error = $cerr ? $cerr : self::errorCode($http, $resp);
                if (self::isFatalTokenError($http, $resp)) {
                    self::deactivateToken($db, $h['token']);
                    $result['deactivated']++;
                    $error .= ' (device removed)';
                }
                $result['results'][$h['id']] = array('ok' => false, 'error' => substr($error, 0, 250));
            }
            curl_multi_close($mh);
        }

        return $result;
    }

    private static function deactivateToken(PDO $db, $token) {
        $stmt = $db->prepare("UPDATE push_tokens SET is_active = 'no' WHERE token = ?");
        $stmt->execute(array($token));
    }

    private static function errorCode($http, $resp) {
        $j = json_decode((string)$resp, true);
        if (is_array($j) && isset($j['error'])) {
            if (!empty($j['error']['details'][0]['errorCode'])) return $j['error']['details'][0]['errorCode'];
            if (!empty($j['error']['status']))  return $j['error']['status'];
            if (!empty($j['error']['message'])) return $j['error']['message'];
        }
        return 'HTTP ' . $http;
    }

    private static function isFatalTokenError($http, $resp) {
        if ($http === 404) return true;
        $up = strtoupper((string)$resp);
        return strpos($up, 'UNREGISTERED') !== false
            || strpos($up, 'SENDER_ID_MISMATCH') !== false
            || ($http === 400 && strpos($up, 'REGISTRATION TOKEN') !== false);
    }

    // -------------------------------------------------------------------
    // OAuth — cache access token to disk for 55 minutes
    // -------------------------------------------------------------------
    private static function getAccessToken() {
        $cache = @file_get_contents(self::ACCESS_TOKEN_CACHE);
        if ($cache) {
            $j = json_decode($cache, true);
            if (is_array($j) && isset($j['token']) && isset($j['expires_at']) && $j['expires_at'] > time() + 30) {
                return $j['token'];
            }
        }

        $sa  = self::loadServiceAccount();
        $now = time();
        $jwt = self::buildSignedJwt($sa, $now);

        $ch = curl_init(self::OAUTH_TOKEN_URL);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query(array(
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            )),
            CURLOPT_HTTPHEADER     => array('Content-Type: application/x-www-form-urlencoded'),
            CURLOPT_TIMEOUT        => 8,
        ));
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http !== 200) throw new Exception('OAuth failed: HTTP ' . $http . ' ' . $resp);
        $j = json_decode($resp, true);
        if (empty($j['access_token'])) throw new Exception('OAuth response missing access_token');

        $token = $j['access_token'];
        @file_put_contents(self::ACCESS_TOKEN_CACHE, json_encode(array('token' => $token, 'expires_at' => $now + self::TOKEN_LIFETIME_SEC)));
        @chmod(self::ACCESS_TOKEN_CACHE, 0600);
        return $token;
    }

    private static function loadServiceAccount() {
        $raw = @file_get_contents(self::SERVICE_ACCOUNT_PATH);
        if ($raw === false) throw new Exception('Service account JSON not readable.');
        $sa = json_decode($raw, true);
        if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key']) || empty($sa['project_id'])) {
            throw new Exception('Service account JSON malformed.');
        }
        return $sa;
    }

    private static function loadProjectId() {
        $sa = self::loadServiceAccount();
        return $sa['project_id'];
    }

    private static function buildSignedJwt($sa, $now) {
        $header = self::b64url(json_encode(array('alg' => 'RS256', 'typ' => 'JWT')));
        $claims = self::b64url(json_encode(array(
            'iss'   => $sa['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud'   => self::OAUTH_TOKEN_URL,
            'iat'   => $now,
            'exp'   => $now + 3600,
        )));
        $unsigned = $header . '.' . $claims;

        $pk = openssl_pkey_get_private($sa['private_key']);
        if (!$pk) throw new Exception('Could not parse private_key from service account JSON.');
        $sig = '';
        if (!openssl_sign($unsigned, $sig, $pk, 'sha256WithRSAEncryption')) {
            throw new Exception('JWT signing failed.');
        }
        if (function_exists('openssl_free_key')) {
            @openssl_free_key($pk);
        }
        return $unsigned . '.' . self::b64url($sig);
    }

    private static function b64url($s) {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }
}
?>
