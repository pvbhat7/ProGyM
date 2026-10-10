<?php
/**
 * Verify a Firebase Auth ID token (RS256 JWT) server-side — no external library.
 *
 * Used by self sign-up so the server trusts only what Firebase proved:
 *   - phone sign-in  → claim `phone_number` ("+919876543210") — OTP was really verified
 *   - Google sign-in → claims `sub` (Firebase uid, stored as client.googleUid) + `email`
 *
 * Checks: Google signature (public certs, cached), aud/iss = our project, exp/iat, sub.
 */
class FirebaseIdToken {

    const PROJECT_ID = 'progym-web';
    const CERTS_URL  = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    const CERTS_CACHE = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/firebase_securetoken_certs.cache';
    const LEEWAY = 300; // seconds of clock skew allowed

    /** @return array claims on success; throws Exception with a short reason otherwise. */
    public static function verify($jwt) {
        $parts = explode('.', (string)$jwt);
        if (count($parts) !== 3) throw new Exception('Malformed token');
        list($h64, $p64, $s64) = $parts;

        $header  = json_decode(self::b64urlDecode($h64), true);
        $payload = json_decode(self::b64urlDecode($p64), true);
        $sig     = self::b64urlDecode($s64);
        if (!is_array($header) || !is_array($payload) || $sig === '') throw new Exception('Malformed token');
        if (($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) throw new Exception('Bad token header');

        $certs = self::certs();
        if (!isset($certs[$header['kid']])) {
            $certs = self::certs(true);   // keys rotate — refetch once
            if (!isset($certs[$header['kid']])) throw new Exception('Unknown signing key');
        }
        $ok = openssl_verify($h64 . '.' . $p64, $sig, $certs[$header['kid']], OPENSSL_ALGO_SHA256);
        if ($ok !== 1) throw new Exception('Bad signature');

        $now = time();
        if (($payload['aud'] ?? '') !== self::PROJECT_ID) throw new Exception('Wrong audience');
        if (($payload['iss'] ?? '') !== 'https://securetoken.google.com/' . self::PROJECT_ID) throw new Exception('Wrong issuer');
        if (intval($payload['exp'] ?? 0) < $now - self::LEEWAY) throw new Exception('Token expired — please sign in again');
        if (intval($payload['iat'] ?? 0) > $now + self::LEEWAY) throw new Exception('Token not yet valid');
        if (empty($payload['sub'])) throw new Exception('Missing subject');
        return $payload;
    }

    private static function certs($force = false) {
        if (!$force && is_readable(self::CERTS_CACHE)) {
            $c = json_decode((string)file_get_contents(self::CERTS_CACHE), true);
            if (is_array($c) && !empty($c['expires']) && $c['expires'] > time() && is_array($c['certs'] ?? null)) {
                return $c['certs'];
            }
        }
        $ch = curl_init(self::CERTS_URL);
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_HEADER => true));
        $resp = curl_exec($ch);
        $hsize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $http  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($resp === false || $http !== 200) throw new Exception('Could not fetch Google certs');
        $certs = json_decode(substr($resp, $hsize), true);
        if (!is_array($certs) || !$certs) throw new Exception('Bad Google certs');

        $maxAge = 3600;
        if (preg_match('/max-age=(\d+)/i', substr($resp, 0, $hsize), $m)) $maxAge = intval($m[1]);
        @file_put_contents(self::CERTS_CACHE, json_encode(array('expires' => time() + $maxAge, 'certs' => $certs)));
        return $certs;
    }

    private static function b64urlDecode($s) {
        $r = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
        return $r === false ? '' : $r;
    }
}
