<?php
// ============================================================================
// SILENT-FATAL SAFETY NET
// ============================================================================
// Any uncaught exception / PHP fatal that would otherwise produce an empty
// 500 body gets converted into a readable JSON response. This runs first —
// it's an auto-prepend, so it protects EVERY /api/*.php request across the
// gym app for free. Debug info is included because all endpoints are behind
// auth or the license gate; nothing here leaks to unauthenticated users.
// ============================================================================
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_exception_handler(function ($e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Access-Control-Allow-Origin: *');
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    error_log('[uncaught] ' . get_class($e) . ': ' . $e->getMessage()
        . ' at ' . $e->getFile() . ':' . $e->getLine());
    echo json_encode(array(
        'ok' => false,
        'error' => 'server_error',
        'message' => 'Internal server error',
        'debug' => array(
            'type' => get_class($e),
            'msg'  => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
        ),
    ));
});

register_shutdown_function(function () {
    $err = error_get_last();
    if (!$err) return;
    $fatalTypes = array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR);
    if (!in_array($err['type'], $fatalTypes, true)) return;
    if (!headers_sent()) {
        http_response_code(500);
        header('Access-Control-Allow-Origin: *');
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    error_log('[fatal] ' . $err['message'] . ' at ' . $err['file'] . ':' . $err['line']);
    echo json_encode(array(
        'ok' => false,
        'error' => 'php_fatal',
        'message' => 'PHP fatal error',
        'debug' => array(
            'msg'  => $err['message'],
            'file' => basename($err['file']),
            'line' => $err['line'],
        ),
    ));
});

/**
 * Auto-prepend license gate for the gym app.
 *
 * Wired via api/.htaccess with `php_value auto_prepend_file` so PHP runs
 * this file at the top of EVERY request to /api/*.php without touching the
 * ~80 individual endpoint files.
 *
 * Responsibilities:
 *   1. Pass through OPTIONS preflight instantly with permissive CORS headers.
 *   2. Skip a whitelist of endpoints that must always work (license itself,
 *      appcontrol kill-switch, static assets).
 *   3. Ask the verifier for current status.
 *   4. If NOT active/grace → respond 423 + JSON + exit before the actual
 *      endpoint runs.
 *   5. Otherwise → return so the target endpoint executes normally.
 *
 * Failure mode: if anything in the gate itself throws, catch → allow the
 * request through. Better a briefly-unenforced app than a fully-bricked
 * one during a bad deploy. The license check will retry on the next request.
 */

// ---------- 1. CORS preflight bypass ----------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 3600');
    http_response_code(204);
    exit;
}

// ---------- 2. Whitelist ----------
// Match by *substring* so the same rules work regardless of whether the API
// is served at /api/... (progym.co.in style) or /PROGYM/ggs/api/... (current
// tavrostechinfo.com hosting). A path is exempt if it contains any of these.
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = strtok($uri, '?'); // strip query string

$exempt_fragments = [
    '/api/license/',      // license endpoints themselves (avoid recursion)
    '/api/appcontrol/',   // existing kill-switch — must keep working
    '/api/img/',          // image serving
    '/api/imgconvert.php',
    '/api/_precheck.php', // health-check must work even when locked
];
foreach ($exempt_fragments as $frag) {
    if (strpos($path, $frag) !== false) return;
}

// ---------- 3. Per-request memoization ----------
// A single request can hit multiple includes (rare for gym's flat endpoints
// but future-proof). Static flag makes subsequent calls no-op.
static $checked = false;
if ($checked) return;
$checked = true;

// ---------- 4. Verify license ----------
try {
    require_once __DIR__ . '/_verifier.php';
    $status = GymLicenseVerifier::currentStatus();

    if (in_array($status['status'] ?? 'locked', ['active', 'grace'], true)) {
        return; // allow the actual endpoint to run
    }

    // Locked — but allow READ endpoints so owner can still view data + reports.
    // Only block WRITES (create/update/delete/etc.) — that's the leverage that
    // pushes renewal without bricking the app.
    if (!isWriteEndpoint($path)) {
        return; // read endpoint — allow even when locked
    }

    // Locked write attempt. Emit HTTP 423 + JSON and stop.
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    http_response_code(423);
    echo json_encode([
        'ok'         => false,
        'locked'     => true,
        'read_only'  => true,
        'reason'     => $status['reason'] ?? 'locked',
        'contact'    => GymLicenseVerifier::contact(),
        'message'    => 'Subscription expired — the app is in read-only mode. Please contact the vendor to renew.',
    ]);
    exit;
} catch (Throwable $e) {
    // Fail OPEN on internal errors — better one bad hour than a dead app.
    // The verifier's own recording of the failure will show up in the
    // license admin panel via check_logs on next successful fetch.
    error_log('[license-prepend] gate error, allowing request: ' . $e->getMessage());
    return;
}

/**
 * Decide whether an API path is a write (mutating) endpoint.
 *
 * Gym API follows a consistent naming convention: verbs at the start of the
 * file name signal intent (create*, update*, delete*, get*, all*, by*...).
 * We prefix-match the basename against a list of write verbs. Anything that
 * doesn't match is treated as a read and allowed through when locked.
 *
 * Erring on the side of "read" is deliberate — during a lockout, letting
 * one unclassified endpoint work is far less bad than accidentally blocking
 * a legitimate read the owner needs to see their data or run a report.
 */
function isWriteEndpoint($path) {
    $basename = strtolower(basename($path, '.php'));
    $writePrefixes = array(
        'create', 'update', 'delete', 'insert', 'save', 'upload',
        'add', 'remove', 'submit', 'approve', 'convert',
        'register', 'cancel', 'refund', 'mark', 'attendance', 'pro_update'
    );
    foreach ($writePrefixes as $p) {
        if (strpos($basename, $p) === 0) return true;
    }
    return false;
}
