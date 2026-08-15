<?php
/**
 * License verifier for the gym app — the trust boundary between this install
 * and the license server. Fetches signed status, verifies RSA signature with
 * public.pem, caches in DB, returns effective status.
 *
 * Adapted from the supplement-shop verifier for the gym's Database-class
 * pattern (config/database.php exports `class Database` with getConnection()).
 * No stores_in_use telemetry — gym has no store quota.
 *
 * Trust anchor: only the RSA signature. If any cached column is tampered
 * with, signature verification fails and the cache is treated as absent.
 */

require_once __DIR__ . '/../../config/database.php';

class GymLicenseVerifier
{
    const HTTP_TIMEOUT_SECONDS     = 5;
    const FRESHNESS_WINDOW_SECONDS = 300; // fresh fetch's issued_at must be within 5 min

    private static $cfg = null;
    private static $conn = null;

    /**
     * Returns the current license status. Never throws — worst case returns
     * status=locked with a reason. Always returns an array with at least:
     *   { status, reason, source, expiry?, grace_until?, cached_at? }
     *
     * $forceFetch=true skips the fresh-cache short-circuit but leaves
     * cached_at untouched so the offline-tolerance fallback (step 3) can
     * still rescue us on transient fetch failures. status.php/refresh.php
     * pass this so the SPA banner reflects live admin lock/unlock ASAP.
     */
    public static function currentStatus($forceFetch = false)
    {
        $cache = self::loadCache();
        $ttl   = (int) self::cfg('cache_ttl_seconds', 3600);
        $cacheFresh = !$forceFetch
            && ($cache !== null)
            && (time() - strtotime($cache['cached_at']) < $ttl);

        // 1. Fresh cache → verify + use
        if ($cacheFresh) {
            $payload = self::verifyCacheRow($cache);
            if ($payload !== null) {
                $payload['source']    = 'cache_fresh';
                $payload['cached_at'] = $cache['cached_at'];
                return $payload;
            }
            // Cache row exists but verification failed (tampered). Fall through.
        }

        // 2. Stale or missing cache → fetch fresh
        $fetched = self::fetchFromServer();
        if ($fetched['ok']) {
            self::saveCache($fetched);
            $payload = $fetched['payload'];
            $payload['source']    = 'fresh_fetch';
            $payload['cached_at'] = date('Y-m-d H:i:s');
            return $payload;
        }

        // 3. Fetch failed → try stale cache within offline tolerance
        if ($cache !== null) {
            $ageSec = time() - strtotime($cache['cached_at']);
            $tolerance = (int) self::cfg('offline_tolerance_seconds', 7 * 86400);
            if ($ageSec <= $tolerance) {
                $payload = self::verifyCacheRow($cache);
                if ($payload !== null) {
                    $payload['source']      = 'cache_stale';
                    $payload['cached_at']   = $cache['cached_at'];
                    $payload['fetch_error'] = $fetched['error'];
                    return $payload;
                }
            }
        }

        // 4. Nothing valid → LOCKED (fail-closed).
        return [
            'status'      => 'locked',
            'reason'      => $cache === null ? 'no_cache_and_unreachable' : 'cache_stale_beyond_tolerance',
            'source'      => 'fallback_lock',
            'fetch_error' => isset($fetched['error']) ? $fetched['error'] : null,
        ];
    }

    /** Public: get the vendor contact info from config, for the lock overlay. */
    public static function contact()
    {
        return [
            'name'  => self::cfg('contact_name', 'Support'),
            'phone' => self::cfg('contact_phone', ''),
            'email' => self::cfg('contact_email', ''),
        ];
    }

    // ----------------------------------------------------------------------

    private static function cfg($key, $default = null)
    {
        if (self::$cfg === null) {
            $path = __DIR__ . '/config.php';
            if (!file_exists($path)) {
                throw new RuntimeException(
                    'Gym license config missing at ' . $path
                    . '. Copy config.example.php and fill in client_code.'
                );
            }
            self::$cfg = require $path;
            if (!is_array(self::$cfg)) {
                throw new RuntimeException('License config must return an array');
            }
        }
        return isset(self::$cfg[$key]) ? self::$cfg[$key] : $default;
    }

    private static function db()
    {
        if (self::$conn === null) {
            $database = new Database();
            self::$conn = $database->getConnection();
            if (self::$conn === null) {
                throw new RuntimeException('Cannot open DB connection for license verifier');
            }
        }
        return self::$conn;
    }

    private static function loadCache()
    {
        try {
            $stmt = self::db()->prepare("SELECT * FROM license_cache WHERE client_code = ? LIMIT 1");
            $stmt->execute([self::cfg('client_code')]);
            $row  = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row === false ? null : $row;
        } catch (Throwable $_e) {
            return null;
        }
    }

    private static function verifyCacheRow(array $cache)
    {
        return self::verifySignedResponse($cache['signed_payload_b64'], $cache['signature']);
    }

    /**
     * Core signature verification. Returns decoded payload on success, null on
     * ANY failure (bad signature, wrong client_code, malformed JSON, etc.).
     */
    private static function verifySignedResponse($payloadB64, $signatureB64)
    {
        $pubPath = self::cfg('public_key_path');
        if (!file_exists($pubPath)) return null;

        $publicKey = file_get_contents($pubPath);
        if ($publicKey === false || $publicKey === '') return null;

        $sigBytes = base64_decode($signatureB64, true);
        if ($sigBytes === false) return null;

        $ok = @openssl_verify($payloadB64, $sigBytes, $publicKey, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) return null;

        $json = base64_decode($payloadB64, true);
        if ($json === false) return null;

        $payload = json_decode($json, true);
        if (!is_array($payload)) return null;

        // Bind: response must be for OUR client_code.
        if (($payload['client_code'] ?? '') !== self::cfg('client_code')) return null;

        // Response must claim a known status.
        if (!in_array($payload['status'] ?? '', ['active', 'grace', 'locked'], true)) return null;

        return $payload;
    }

    private static function fetchFromServer()
    {
        $nonce = bin2hex(random_bytes(16));
        $req = [
            'client_code' => self::cfg('client_code'),
            'nonce'       => $nonce,
            // No stores_in_use — gym has no store concept.
        ];
        $body = json_encode($req);

        $ch = curl_init(self::cfg('server_url'));
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => self::HTTP_TIMEOUT_SECONDS,
            CURLOPT_TIMEOUT        => self::HTTP_TIMEOUT_SECONDS,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $raw    = curl_exec($ch);
        $err    = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        self::recordFetchAttempt($err !== '' ? $err : ($status !== 200 ? "HTTP {$status}" : null));

        if ($raw === false || $raw === '') {
            return ['ok' => false, 'error' => $err !== '' ? $err : 'empty_response'];
        }
        if ($status !== 200) {
            return ['ok' => false, 'error' => "HTTP {$status}"];
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || empty($decoded['ok']) || empty($decoded['payload_b64']) || empty($decoded['signature'])) {
            return ['ok' => false, 'error' => 'malformed_response'];
        }

        $payload = self::verifySignedResponse($decoded['payload_b64'], $decoded['signature']);
        if ($payload === null) {
            return ['ok' => false, 'error' => 'signature_verify_failed'];
        }
        if (($payload['nonce'] ?? '') !== $nonce) {
            return ['ok' => false, 'error' => 'nonce_mismatch'];
        }
        $issued = strtotime($payload['issued_at'] ?? '');
        if ($issued === false || $issued < time() - self::FRESHNESS_WINDOW_SECONDS || $issued > time() + 60) {
            return ['ok' => false, 'error' => 'stale_or_future_issued_at'];
        }

        return [
            'ok'                 => true,
            'payload'            => $payload,
            'signed_payload_b64' => $decoded['payload_b64'],
            'signature'          => $decoded['signature'],
            'key_version'        => isset($decoded['key_version']) ? (int) $decoded['key_version'] : 1,
        ];
    }

    private static function saveCache(array $fetched)
    {
        try {
            $stmt = self::db()->prepare(
                "INSERT INTO license_cache
                    (client_code, signed_payload_b64, signature, key_version, cached_at)
                 VALUES (?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                    signed_payload_b64 = VALUES(signed_payload_b64),
                    signature          = VALUES(signature),
                    key_version        = VALUES(key_version),
                    cached_at          = VALUES(cached_at)"
            );
            $stmt->execute([
                self::cfg('client_code'),
                $fetched['signed_payload_b64'],
                $fetched['signature'],
                $fetched['key_version'],
            ]);
        } catch (Throwable $_e) {
            // Non-fatal — verifier will just refetch next time.
        }
    }

    private static function recordFetchAttempt($errorOrNull)
    {
        try {
            self::db()->prepare(
                "INSERT INTO license_cache (client_code, signed_payload_b64, signature, last_fetch_attempt_at, last_fetch_error)
                 VALUES (?, '', '', NOW(), ?)
                 ON DUPLICATE KEY UPDATE
                    last_fetch_attempt_at = NOW(),
                    last_fetch_error      = VALUES(last_fetch_error)"
            )->execute([self::cfg('client_code'), $errorOrNull]);
        } catch (Throwable $_e) {
            // Telemetry failure must never break the license flow.
        }
    }
}
