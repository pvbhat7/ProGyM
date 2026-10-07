<?php
/**
 * Attendance-alert recipients (Admin → Settings).
 *
 * GET              → { contacts: [{ id, name, mobile, pushDevices }], zones: ['red','yellow','green'] }
 * POST { zones: ['red'] } → saves which member zones trigger alerts
 * GET ?q=term      → { results:  [{ id, name, mobile, pushDevices }] }  member search by name / mobile
 * POST { clientIds: [1, 2] } → saves the list, returns { success, contacts }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

include_once '../../config/database.php';
include_once '../../class/AttendanceAlert.php';

$db = (new Database())->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    // POST { zones: ['red', 'yellow'] } — which member zones trigger alerts
    if (isset($data['zones']) && is_array($data['zones'])) {
        $flags = AttendanceAlert::flags();
        $flags['attendanceAlertZones'] = array_values(array_intersect(AttendanceAlert::ZONES, $data['zones']));
        if (!AttendanceAlert::saveFlags($flags)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Could not save settings']);
            exit;
        }
        echo json_encode(['success' => true, 'zones' => AttendanceAlert::zones()]);
        exit;
    }

    if (!isset($data['clientIds']) || !is_array($data['clientIds'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'clientIds array required']);
        exit;
    }
    $ids = array_values(array_unique(array_filter(array_map('intval', $data['clientIds']), function ($v) { return $v > 0; })));
    $flags = AttendanceAlert::flags();
    $flags['attendanceAlertClientIds'] = $ids;
    if (!AttendanceAlert::saveFlags($flags)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Could not save settings']);
        exit;
    }
    echo json_encode(['success' => true, 'contacts' => AttendanceAlert::contacts($db, $ids)]);
    exit;
}

$q = trim($_GET['q'] ?? '');
if ($q !== '') {
    $digits = preg_replace('/\D/', '', $q);
    $s = $db->prepare(
        "SELECT id FROM client
          WHERE COALESCE(discontinue, '') <> 'true' AND (name LIKE ? " . ($digits !== '' ? "OR mobile LIKE ?" : "") . ")
          ORDER BY (profileActiveFlag = 'enable') DESC, name LIMIT 10"
    );
    $s->execute($digits !== '' ? ['%' . $q . '%', '%' . $digits . '%'] : ['%' . $q . '%']);
    $ids = array_map('intval', $s->fetchAll(PDO::FETCH_COLUMN));
    echo json_encode(['results' => AttendanceAlert::contacts($db, $ids)]);
    exit;
}

echo json_encode(['contacts' => AttendanceAlert::contacts($db), 'zones' => AttendanceAlert::zones()]);
