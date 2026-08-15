<?php
/**
 * Admin-only — returns every caller user with their credentials, group, and
 * how many of their 15 clients have been marked called. Used by the admin
 * page to manage and share caller logins.
 *
 * GET /api/wc_calls/adminOverview.php?username=X&password=Y
 * → { ok, total_groups, group_size, callers: [
 *       { username, password, group_index, total_in_group, called_count }
 *   ] }
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include_once '../../config/database.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok"=>false,"message"=>"DB"]); exit; }

$username = isset($_GET['username']) ? trim($_GET['username']) : '';
$password = isset($_GET['password']) ? trim($_GET['password']) : '';

$stmt = $db->prepare("SELECT role FROM wc_call_users WHERE username = :u AND password = :p LIMIT 1");
$stmt->execute([':u'=>$username, ':p'=>$password]);
$me = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$me || $me['role'] !== 'admin') {
    http_response_code(401);
    echo json_encode(["ok"=>false,"message"=>"Admin only"]);
    exit;
}

$groupSize = 15;
$totalParticipants = (int)$db->query("SELECT COUNT(*) FROM wc_participants")->fetchColumn();
$totalGroups       = (int)ceil($totalParticipants / $groupSize);

// Build the ordered participant list once, then count by group.
$ordered = $db->query("
    SELECT c.id
    FROM wc_participants p
    JOIN client c ON c.id = p.client_id
    ORDER BY c.name ASC, c.id ASC
")->fetchAll(PDO::FETCH_COLUMN);

// Map client_id → call_log.called_done
$logRows = $db->query("SELECT client_id, called_done FROM wc_call_log")->fetchAll(PDO::FETCH_KEY_PAIR);

$perGroup = array_fill(0, $totalGroups, ['total' => 0, 'called' => 0]);
foreach ($ordered as $i => $cid) {
    $g = intdiv($i, $groupSize);
    $perGroup[$g]['total']++;
    if (isset($logRows[$cid]) && $logRows[$cid] === 'yes') {
        $perGroup[$g]['called']++;
    }
}

$callers = $db->query("
    SELECT username, password, group_index, shared_with
    FROM wc_call_users
    WHERE role = 'caller'
    ORDER BY group_index ASC
")->fetchAll(PDO::FETCH_ASSOC);

foreach ($callers as &$c) {
    $g = (int)$c['group_index'];
    $c['group_index']    = $g;
    $c['total_in_group'] = $perGroup[$g]['total']  ?? 0;
    $c['called_count']   = $perGroup[$g]['called'] ?? 0;
}

echo json_encode([
    "ok"           => true,
    "total_groups" => $totalGroups,
    "group_size"   => $groupSize,
    "callers"      => $callers,
]);
?>
