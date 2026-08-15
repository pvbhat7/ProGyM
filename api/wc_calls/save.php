<?php
/**
 * Update the call_log row for one client (upsert).
 *
 * POST /api/wc_calls/save.php
 * Body JSON: { username, password, client_id, called_done, comments }
 * → { ok }
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Short-circuit CORS preflight so cross-origin POSTs from progym.co.in succeed.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once '../../config/database.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok"=>false,"message"=>"DB"]); exit; }

$data       = json_decode(file_get_contents("php://input"));
$username   = isset($data->username)    ? trim($data->username)    : '';
$password   = isset($data->password)    ? trim($data->password)    : '';
$client_id  = isset($data->client_id)   ? (int)$data->client_id    : 0;
$calledDone = isset($data->called_done) && $data->called_done === 'yes' ? 'yes' : 'no';
$comments   = isset($data->comments)    ? trim($data->comments)    : '';

if ($username === '' || $password === '' || $client_id <= 0) {
    http_response_code(400);
    echo json_encode(["ok"=>false,"message"=>"Bad input"]);
    exit;
}

$stmt = $db->prepare("SELECT role FROM wc_call_users WHERE username = :u AND password = :p LIMIT 1");
$stmt->execute([':u'=>$username, ':p'=>$password]);
$me = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$me) { http_response_code(401); echo json_encode(["ok"=>false,"message"=>"Invalid credentials"]); exit; }

$sql = "
    INSERT INTO wc_call_log (client_id, called_done, comments, updated_by, updated_at)
    VALUES (:cid, :cd, :cm, :ub, NOW())
    ON DUPLICATE KEY UPDATE
        called_done = VALUES(called_done),
        comments    = VALUES(comments),
        updated_by  = VALUES(updated_by),
        updated_at  = NOW()
";
$stmt = $db->prepare($sql);
$stmt->execute([
    ':cid' => $client_id,
    ':cd'  => $calledDone,
    ':cm'  => $comments,
    ':ub'  => $username,
]);

echo json_encode(["ok"=>true]);
?>
