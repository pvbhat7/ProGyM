<?php
/**
 * Return the participants for a given group_index, joined with client info
 * and the current call_log state. Caller can see only their own group;
 * admin can request any group_index.
 *
 * GET /api/wc_calls/list.php?username=X&password=Y&group_index=N
 * → {
 *     ok, group_index, total_groups, group_size, rows: [
 *       { client_id, name, mobile, is_gym_member, called_done, comments,
 *         updated_by, updated_at }
 *     ]
 *   }
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include_once '../../config/database.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok"=>false,"message"=>"DB"]); exit; }

$username = isset($_GET['username']) ? trim($_GET['username']) : '';
$password = isset($_GET['password']) ? trim($_GET['password']) : '';
$reqGroup = isset($_GET['group_index']) && $_GET['group_index'] !== '' ? (int)$_GET['group_index'] : null;

$stmt = $db->prepare("SELECT role, group_index FROM wc_call_users WHERE username = :u AND password = :p LIMIT 1");
$stmt->execute([':u'=>$username, ':p'=>$password]);
$me = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$me) { http_response_code(401); echo json_encode(["ok"=>false,"message"=>"Invalid credentials"]); exit; }

$role     = $me['role'];
$myGroup  = $me['group_index'] !== null ? (int)$me['group_index'] : null;

// Determine which group to return
$useGroup = ($role === 'admin') ? ($reqGroup !== null ? $reqGroup : 0) : $myGroup;
if ($useGroup === null) {
    http_response_code(400);
    echo json_encode(["ok"=>false,"message"=>"No group assigned"]);
    exit;
}

$groupSize = 15;
$offset    = $useGroup * $groupSize;

$totalParticipants = (int)$db->query("SELECT COUNT(*) FROM wc_participants")->fetchColumn();
$totalGroups       = (int)ceil($totalParticipants / $groupSize);

// Sorted by client.name ASC, client.id ASC — stable group composition.
$sql = "
    SELECT
        c.id     AS client_id,
        c.name   AS name,
        c.mobile AS mobile,
        c.isGymClient AS is_gym_client,
        cl.called_done,
        cl.comments,
        cl.updated_by,
        cl.updated_at
    FROM wc_participants p
    JOIN client c       ON c.id = p.client_id
    LEFT JOIN wc_call_log cl ON cl.client_id = c.id
    ORDER BY c.name ASC, c.id ASC
    LIMIT :lim OFFSET :off
";
$stmt = $db->prepare($sql);
$stmt->bindValue(':lim', $groupSize, PDO::PARAM_INT);
$stmt->bindValue(':off', $offset, PDO::PARAM_INT);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Normalize
foreach ($rows as &$r) {
    $r['client_id']     = (int)$r['client_id'];
    $r['called_done']   = $r['called_done'] ?: 'no';
    $r['comments']      = $r['comments']    ?: '';
    $r['is_gym_client'] = $r['is_gym_client'] === 'yes' ? 'yes' : 'no';
}

echo json_encode([
    "ok"           => true,
    "role"         => $role,
    "group_index"  => $useGroup,
    "total_groups" => $totalGroups,
    "group_size"   => $groupSize,
    "rows"         => $rows,
]);
?>
