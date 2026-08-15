<?php
/**
 * Sends Web Push notifications via Firebase Cloud Messaging HTTP v1.
 *
 * Uses the service account JSON at SERVICE_ACCOUNT_PATH to mint a short-lived
 * OAuth2 access token (cached to disk for ~55 minutes — Google's tokens are
 * valid for 60). Then POSTs to fcm.googleapis.com/v1/projects/{pid}/messages:send.
 *
 * Public entry points:
 *   sendToClient($db, $client_id, $title, $body, $data = [], $event_type, $event_key)
 *   sendToClients($db, [$client_ids], ...)
 *
 * Per-token failure handling:
 *   - 404 / UNREGISTERED / INVALID_ARGUMENT  → mark token is_active = 'no'
 *   - other errors                           → log and continue
 *
 * Logging:
 *   Every send attempt (success OR failure) writes a wc_notifications_log row.
 *   The event_key column is UNIQUE — callers should pass a deterministic key
 *   like "settle:pred:123" or "kickoff:match:9:client:42" to make sends safely
 *   idempotent (a duplicate INSERT IGNORE just skips).
 */

class WcFcmSender {

    const SERVICE_ACCOUNT_PATH = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/progym-web-firebase-adminsdk-fbsvc-9ee471a708.json';
    const ACCESS_TOKEN_CACHE   = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/fcm_access_token.cache';
    const FCM_ENDPOINT_TPL     = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';
    const OAUTH_TOKEN_URL      = 'https://oauth2.googleapis.com/token';
    const TOKEN_LIFETIME_SEC   = 3300;  // 55 minutes — Google issues 60-min tokens, keep margin
    const FRONTEND_BASE_URL    = 'https://tavrostechinfo.com/wc2026';

    // -------------------------------------------------------------------
    // Public — send to all active tokens of a single client
    // -------------------------------------------------------------------
    public static function sendToClient(PDO $db, $client_id, $title, $body, $data = array(), $event_type = 'generic', $event_key = null) {
        if ($event_key === null) {
            $event_key = $event_type . ':' . $client_id . ':' . microtime(true);
        }

        // Pre-log gate — if this event_key already exists, bail.
        if (self::alreadySent($db, $event_key)) {
            return array('sent' => 0, 'skipped_dedup' => true);
        }

        $tokens = self::getActiveTokensFor($db, $client_id);
        if (empty($tokens)) {
            self::logEntry($db, $event_key, $event_type, $client_id, null, $title, $body, $data, 'no_tokens', null);
            return array('sent' => 0, 'no_tokens' => true);
        }

        $accessToken = self::getAccessToken();
        $projectId   = self::loadProjectId();

        $sentCount = 0;
        foreach ($tokens as $tk) {
            $perKey = $event_key . ':tok:' . substr(md5($tk), 0, 8);
            $res = self::sendOne($accessToken, $projectId, $tk, $title, $body, $data);
            self::logEntry($db, $perKey, $event_type, $client_id, $tk, $title, $body, $data, $res['status'], $res['error']);

            if ($res['status'] === 'ok') {
                $sentCount++;
            } else if (self::isFatalTokenError($res['error'])) {
                self::deactivateToken($db, $tk);
            }
        }

        // The "header" event_key row (one per client per event) so callers can
        // safely re-call sendToClient on a retry without re-spamming tokens.
        self::logEntry($db, $event_key, $event_type, $client_id, null, $title, $body, $data, 'completed', null);

        return array('sent' => $sentCount, 'tokens_attempted' => count($tokens));
    }

    // -------------------------------------------------------------------
    // Composite — full settle-time notification flow for one match.
    //   1) Per-predictor:   "🎉 You won X ⚽ on A vs B" (or 0-coin losing variant)
    //   2) Broadcast:       "🏁 A beat B 2-1" to every participant who did NOT
    //                       predict on this match (skips predictors so they
    //                       don't get two notifications).
    //
    // Idempotent: per-predictor uses event_key 'settle:pred:{prediction_id}',
    // broadcast uses 'result:match:{match_id}:client:{client_id}'. Reset SQL
    // wipes both prefixes.
    // -------------------------------------------------------------------
    public static function notifyMatchSettled(
        PDO $db,
        $match_id,
        $team_a_name,
        $team_b_name,
        $winner,        // 'A' | 'B' | 'DRAW'
        $score_a,
        $score_b,
        $per_user        // array as returned by WcScoringHelper
    ) {
        $matchLabel = $team_a_name . ' vs ' . $team_b_name;

        // ---------- 1. Per-predictor notifications ----------
        $predictorIds = array();
        foreach ($per_user as $u) {
            $cid = (int)$u['client_id'];
            $predictorIds[$cid] = true;
            $coins = (float)$u['coins'];
            if ($coins > 0) {
                $title = "🎉 You won {$coins} ⚽ on " . $matchLabel;
                $body  = "{$matchLabel} ended {$score_a}-{$score_b}. Tap to see your pick.";
            } else {
                $title = "Result: " . $matchLabel . " ({$score_a}-{$score_b})";
                $body  = "Your prediction didn't land this time. Next match awaits!";
            }
            self::sendToClient(
                $db,
                $cid,
                $title,
                $body,
                array(
                    'click_action' => self::FRONTEND_BASE_URL . '/my-picks',
                    'match_id'     => (string)$match_id,
                    'coins'        => (string)$coins,
                ),
                'prediction_settled',
                'settle:pred:' . (int)$u['prediction_id']
            );
        }

        // ---------- 2. Broadcast to non-predictor participants ----------
        if ($winner === 'A') {
            $bTitle = "🏁 {$team_a_name} beat {$team_b_name} {$score_a}-{$score_b}";
        } else if ($winner === 'B') {
            $bTitle = "🏁 {$team_b_name} beat {$team_a_name} {$score_b}-{$score_a}";
        } else {
            $bTitle = "⚖️ {$matchLabel} ended in a draw ({$score_a}-{$score_b})";
        }
        $bBody = "Full-time. Tap to view match details.";

        $stmt = $db->query("SELECT client_id FROM wc_participants");
        $broadcastClients = array();
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $cid = (int)$r['client_id'];
            if (isset($predictorIds[$cid])) continue; // predictor already got their personalized msg
            $broadcastClients[] = $cid;
        }

        foreach ($broadcastClients as $cid) {
            self::sendToClient(
                $db,
                $cid,
                $bTitle,
                $bBody,
                array(
                    'click_action' => self::FRONTEND_BASE_URL . '/match/' . $match_id,
                    'match_id'     => (string)$match_id,
                ),
                'match_result',
                'result:match:' . $match_id . ':client:' . $cid
            );
        }

        return array(
            'predictors_notified'  => count($per_user),
            'broadcast_recipients' => count($broadcastClients),
        );
    }

    // -------------------------------------------------------------------
    // Send to many clients at once. Each (client_id, event_type) is one
    // outgoing notification keyed by "{eventKeyPrefix}:client:{client_id}".
    // -------------------------------------------------------------------
    public static function sendToClients(PDO $db, $client_ids, $title, $body, $data, $event_type, $event_key_prefix) {
        $summary = array('total_sent' => 0, 'clients' => array());
        foreach ($client_ids as $cid) {
            $cid = (int)$cid;
            $r = self::sendToClient($db, $cid, $title, $body, $data, $event_type, $event_key_prefix . ':client:' . $cid);
            $summary['total_sent'] += isset($r['sent']) ? $r['sent'] : 0;
            $summary['clients'][$cid] = $r;
        }
        return $summary;
    }

    // -------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------
    private static function getActiveTokensFor(PDO $db, $client_id) {
        $stmt = $db->prepare("SELECT token FROM wc_fcm_tokens WHERE client_id = :cid AND is_active = 'yes'");
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        $out = array();
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) $out[] = $r['token'];
        return $out;
    }

    private static function deactivateToken(PDO $db, $token) {
        $stmt = $db->prepare("UPDATE wc_fcm_tokens SET is_active = 'no' WHERE token = :t");
        $stmt->bindParam(':t', $token);
        $stmt->execute();
    }

    private static function alreadySent(PDO $db, $event_key) {
        $stmt = $db->prepare("SELECT 1 FROM wc_notifications_log WHERE event_key = :k LIMIT 1");
        $stmt->bindParam(':k', $event_key);
        $stmt->execute();
        return (bool)$stmt->fetchColumn();
    }

    private static function logEntry(PDO $db, $event_key, $event_type, $client_id, $token, $title, $body, $data, $status, $error) {
        try {
            $stmt = $db->prepare(
                "INSERT IGNORE INTO wc_notifications_log
                 (event_key, event_type, client_id, token, title, body, payload, fcm_status, error_msg, sent_at)
                 VALUES (:k, :et, :cid, :tk, :t, :b, :p, :st, :er, NOW())"
            );
            $stmt->bindParam(':k',   $event_key);
            $stmt->bindParam(':et',  $event_type);
            $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
            $stmt->bindParam(':tk',  $token);
            $stmt->bindParam(':t',   $title);
            $stmt->bindParam(':b',   $body);
            $payload = json_encode($data);
            $stmt->bindParam(':p',  $payload);
            $stmt->bindParam(':st', $status);
            $stmt->bindParam(':er', $error);
            $stmt->execute();
        } catch (Exception $e) { /* logging never throws */ }
    }

    private static function isFatalTokenError($err) {
        if (!$err) return false;
        $up = strtoupper($err);
        return strpos($up, 'UNREGISTERED') !== false
            || strpos($up, 'INVALID_ARGUMENT') !== false
            || strpos($up, 'NOT_FOUND') !== false
            || strpos($up, 'SENDER_ID_MISMATCH') !== false;
    }

    // -------------------------------------------------------------------
    // Send one — FCM HTTP v1 POST
    // -------------------------------------------------------------------
    private static function sendOne($accessToken, $projectId, $token, $title, $body, $data) {
        $url = sprintf(self::FCM_ENDPOINT_TPL, $projectId);

        // Stringify all data values — FCM requires string-only data payload.
        $dataString = array();
        foreach ((array)$data as $k => $v) {
            $dataString[$k] = is_scalar($v) ? (string)$v : json_encode($v);
        }

        $clickUrl = isset($dataString['click_action']) ? $dataString['click_action'] : self::FRONTEND_BASE_URL;

        $message = array(
            'message' => array(
                'token' => $token,
                // Use 'data' + 'webpush.notification' so the service worker can
                // customize click behavior. Adding 'notification' alongside
                // forces Chrome to display even when tab is in background.
                'notification' => array(
                    'title' => $title,
                    'body'  => $body,
                ),
                'data' => $dataString,
                'webpush' => array(
                    'fcm_options' => array(
                        'link' => $clickUrl,
                    ),
                    'notification' => array(
                        'icon'  => 'https://tavrostechinfo.com/wc2026/icon-192.png',
                        'badge' => 'https://tavrostechinfo.com/wc2026/icon-192.png',
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
            CURLOPT_TIMEOUT        => 8,
        ));
        $resp = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        if ($cerr) return array('status' => 'curl_error', 'error' => $cerr);
        if ($http >= 200 && $http < 300) return array('status' => 'ok', 'error' => null);

        $errCode = '';
        $j = json_decode($resp, true);
        if (is_array($j) && isset($j['error'])) {
            $errCode = isset($j['error']['status']) ? $j['error']['status'] : '';
            if (!$errCode && isset($j['error']['message'])) $errCode = substr($j['error']['message'], 0, 100);
        }
        return array('status' => 'http_' . $http, 'error' => $errCode ?: ('HTTP ' . $http));
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

        $sa = self::loadServiceAccount();
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
        if (empty($j['access_token'])) throw new Exception('OAuth response missing access_token: ' . $resp);

        $token   = $j['access_token'];
        $expires = $now + self::TOKEN_LIFETIME_SEC;
        @file_put_contents(self::ACCESS_TOKEN_CACHE, json_encode(array('token' => $token, 'expires_at' => $expires)));
        @chmod(self::ACCESS_TOKEN_CACHE, 0600);
        return $token;
    }

    private static function loadServiceAccount() {
        $raw = @file_get_contents(self::SERVICE_ACCOUNT_PATH);
        if ($raw === false) throw new Exception('Service account JSON not readable at ' . self::SERVICE_ACCOUNT_PATH);
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
            @openssl_free_key($pk); // suppress PHP 8 deprecation
        }
        return $unsigned . '.' . self::b64url($sig);
    }

    private static function b64url($s) {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }
}
?>
