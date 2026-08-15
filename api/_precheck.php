<?php
/**
 * Health-check endpoint for the gym backend.
 *
 * Hit this any time you suspect the API is misbehaving. It walks every
 * dependency the gym app relies on and reports which step failed — turning
 * "is the server sane?" from a 20-minute investigation into a 5-second answer.
 *
 * Whitelisted in api/license/_prepend.php so it works even when the
 * subscription is locked.
 *
 *   curl https://tavrostechinfo.com/PROGYM/ggs/api/_precheck.php
 */

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$checks = array();
$overallOk = true;

function gym_precheck_step(&$checks, &$overallOk, $name, $fn) {
    $t0 = microtime(true);
    try {
        $detail = $fn();
        $checks[] = array(
            'step'   => $name,
            'ok'     => true,
            'ms'     => round((microtime(true) - $t0) * 1000, 1),
            'detail' => $detail,
        );
    } catch (Throwable $e) {
        $overallOk = false;
        $checks[] = array(
            'step'  => $name,
            'ok'    => false,
            'ms'    => round((microtime(true) - $t0) * 1000, 1),
            'error' => $e->getMessage(),
            'file'  => basename($e->getFile()),
            'line'  => $e->getLine(),
        );
    }
}

gym_precheck_step($checks, $overallOk, 'php_version', function () {
    return array('version' => PHP_VERSION, 'sapi' => PHP_SAPI);
});

gym_precheck_step($checks, $overallOk, 'opcache', function () {
    if (!function_exists('opcache_get_status')) return array('enabled' => false, 'note' => 'extension not loaded');
    $status = @opcache_get_status(false);
    $cfg    = @opcache_get_configuration();
    return array(
        'enabled'             => is_array($status) && !empty($status['opcache_enabled']),
        'validate_timestamps' => isset($cfg['directives']['opcache.validate_timestamps']) ? $cfg['directives']['opcache.validate_timestamps'] : null,
        'revalidate_freq'     => isset($cfg['directives']['opcache.revalidate_freq']) ? $cfg['directives']['opcache.revalidate_freq'] : null,
        'cached_scripts'      => is_array($status) && isset($status['opcache_statistics']['num_cached_scripts']) ? $status['opcache_statistics']['num_cached_scripts'] : null,
    );
});

gym_precheck_step($checks, $overallOk, 'timezone', function () {
    return array('tz' => date_default_timezone_get(), 'now' => date('c'));
});

gym_precheck_step($checks, $overallOk, 'license_gate_files', function () {
    $required = array(
        'license/_prepend.php',
        'license/_verifier.php',
        'license/config.php',
        'license/public.pem',
    );
    $missing = array();
    foreach ($required as $rel) {
        if (!file_exists(__DIR__ . '/' . $rel)) $missing[] = $rel;
    }
    // Always list what's actually in license/ so a "missing" report can be
    // instantly cross-checked (case sensitivity, alternate filenames, etc.).
    $licenseDir = __DIR__ . '/license';
    $actual = is_dir($licenseDir) ? array_values(array_diff(scandir($licenseDir) ?: [], array('.', '..'))) : array('<not a directory>');
    if ($missing) {
        throw new RuntimeException('missing: ' . implode(', ', $missing) . ' | actual contents: ' . implode(', ', $actual));
    }
    return array('checked' => count($required), 'actual_files' => $actual);
});

gym_precheck_step($checks, $overallOk, 'db_config', function () {
    $dbConfig = __DIR__ . '/../config/database.php';
    if (!file_exists($dbConfig)) throw new RuntimeException('config/database.php not found');
    return array('config_present' => true);
});

gym_precheck_step($checks, $overallOk, 'db_connect', function () {
    // Trigger the app's Database class the same way endpoints do so we
    // exercise the real code path, not a synthetic PDO connection.
    require_once __DIR__ . '/../config/database.php';
    if (!class_exists('Database')) throw new RuntimeException('Database class not defined after include');
    $db = new Database();
    $conn = $db->getConnection();
    if (!$conn) throw new RuntimeException('Database::getConnection returned null');
    $stmt = $conn->query('SELECT 1 AS ok');
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || (int)$row['ok'] !== 1) throw new RuntimeException('SELECT 1 did not return 1');
    return array('ok' => true);
});

gym_precheck_step($checks, $overallOk, 'license_cache_table', function () {
    require_once __DIR__ . '/../config/database.php';
    $db = new Database();
    $conn = $db->getConnection();
    $stmt = $conn->query("SHOW TABLES LIKE 'license_cache'");
    if (!$stmt->fetch()) throw new RuntimeException('license_cache table not found — run migrations/2026_08_06_add_license_cache.sql');
    return array('exists' => true);
});

gym_precheck_step($checks, $overallOk, 'disk_write', function () {
    $tmp = sys_get_temp_dir() . '/_precheck_' . bin2hex(random_bytes(4)) . '.txt';
    if (@file_put_contents($tmp, 'ok') === false) throw new RuntimeException('cannot write to ' . $tmp);
    @unlink($tmp);
    return array('tmp_dir' => sys_get_temp_dir());
});

http_response_code($overallOk ? 200 : 500);
echo json_encode(array(
    'ok'          => $overallOk,
    'app'         => 'progym:api',
    'server_time' => date('c'),
    'checks'      => $checks,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
