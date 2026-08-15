<?php
/**
 * GET /api/license/status.php
 *
 * Returns current effective license status. The gym frontend polls this
 * every ~10s so admin lock/unlock propagates ASAP.
 *
 * This endpoint MUST bypass the license gate (otherwise the frontend can
 * never learn WHY it's locked). It's whitelisted in _prepend.php.
 *
 * We force-refresh the cache here so polling always sees the freshest signed
 * response — other endpoints still ride the 1-hour cache via _prepend.
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204); exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/_verifier.php';

// forceFetch=true makes the verifier always try a fresh fetch, but leaves
// cached_at untouched so the offline-tolerance fallback still works on
// transient failures. Old pattern nuked cached_at='1970' which caused
// spurious locks whenever a poll's outbound curl had a transient error.
$status  = GymLicenseVerifier::currentStatus(true);
$contact = GymLicenseVerifier::contact();

echo json_encode([
    'ok'      => true,
    'license' => array_merge($status, [
        'contact' => $contact,
    ]),
]);
