<?php
/**
 * POST /api/license/refresh.php
 *
 * Force a fresh fetch from the license server (skips local cache). Manual
 * "Refresh" button on the License page + optional cron.
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204); exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/_verifier.php';

// Force a fresh fetch without destroying cached_at — see status.php note.
$status  = GymLicenseVerifier::currentStatus(true);
$contact = GymLicenseVerifier::contact();

echo json_encode([
    'ok'      => true,
    'license' => array_merge($status, [
        'contact' => $contact,
    ]),
]);
