<?php
/**
 * How many members / push-enabled devices an audience reaches.
 *
 * GET ?audience=all|active|inactive|male|female|client&value=<clientId>
 * → { "members": 412, "membersWithPush": 57, "devices": 63 }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';
include_once './_audience.php';

$audience = isset($_GET['audience']) ? $_GET['audience'] : '';
$value    = isset($_GET['value'])    ? $_GET['value']    : '';

$filter = push_audience_filter($audience, $value);
if ($filter === null) {
    http_response_code(400);
    echo json_encode(array("message" => "Invalid audience."));
    exit;
}
list($where, $params) = $filter;

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare("SELECT COUNT(*) FROM client c WHERE $where");
$stmt->execute($params);
$members = (int)$stmt->fetchColumn();

$stmt = $db->prepare(
    "SELECT COUNT(DISTINCT t.client_id) AS m, COUNT(*) AS d
     FROM push_tokens t JOIN client c ON c.id = t.client_id
     WHERE t.is_active = 'yes' AND $where"
);
$stmt->execute($params);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode(array(
    "members"         => $members,
    "membersWithPush" => (int)$row['m'],
    "devices"         => (int)$row['d'],
));
?>
