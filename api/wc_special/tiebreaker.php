<?php
// Tournament-wide tiebreaker estimate (total goals across M101-M104).
// Editable until M101 locks (15 min before SF1 kickoff).
//
// GET  /api/wc_special/tiebreaker.php?client_id=123   → current estimate + lock status
// POST /api/wc_special/tiebreaker.php JSON: { client_id, total_goals }

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }
$sp = new WcSpecialPrediction($db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $body = json_decode(file_get_contents("php://input"), true);
    if (!is_array($body)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'invalid JSON']); exit; }
    $client_id = isset($body['client_id']) ? (int)$body['client_id'] : 0;
    $total     = isset($body['total_goals']) ? (int)$body['total_goals'] : -1;
    if ($client_id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'client_id required']); exit; }
    $res = $sp->upsertTiebreaker($client_id, $total);
    if (!$res['ok']) { http_response_code(400); echo json_encode($res); exit; }
    echo json_encode(['ok' => true, 'total_goals' => $total]);
    exit;
}

// GET
$client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
$lockStmt = $db->query("SELECT (DATE_SUB(kickoff_at, INTERVAL 15 MINUTE) > NOW()) AS open_now,
                               kickoff_at FROM wc_matches WHERE id = 101");
$lock = $lockStmt->fetch(PDO::FETCH_ASSOC);
$mine = $client_id > 0 ? $sp->getUserTiebreaker($client_id) : null;
echo json_encode([
    'ok' => true,
    'open' => $lock ? ((int)$lock['open_now'] === 1) : false,
    'locks_at' => $lock ? $lock['kickoff_at'] : null,
    'my_estimate' => $mine,
]);
?>
