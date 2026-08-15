<?php
/**
 * Validate caller / admin login for the WC bonanza call-list page.
 * TEMPORARY tool — drop wc_call_users + wc_call_log after the calling drive.
 *
 * GET /api/wc_calls/login.php?username=X&password=Y
 * → { ok, username, role, group_index, total_groups }
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include_once '../../config/database.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok"=>false,"message"=>"DB connection failed"]); exit; }

$username = isset($_GET['username']) ? trim($_GET['username']) : '';
$password = isset($_GET['password']) ? trim($_GET['password']) : '';
if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(["ok"=>false,"message"=>"username and password required"]);
    exit;
}

$stmt = $db->prepare("SELECT username, role, group_index FROM wc_call_users WHERE username = :u AND password = :p LIMIT 1");
$stmt->execute([':u'=>$username, ':p'=>$password]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    http_response_code(401);
    echo json_encode(["ok"=>false,"message"=>"Invalid credentials"]);
    exit;
}

$totalGroups = (int)ceil(((int)$db->query("SELECT COUNT(*) FROM wc_participants")->fetchColumn()) / 15);

echo json_encode([
    "ok"           => true,
    "username"     => $row['username'],
    "role"         => $row['role'],
    "group_index"  => $row['group_index'] !== null ? (int)$row['group_index'] : null,
    "total_groups" => $totalGroups,
]);
?>
