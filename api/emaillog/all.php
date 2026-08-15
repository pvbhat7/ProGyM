<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$type     = isset($_GET['type'])     ? trim($_GET['type'])     : '';
$clientId = isset($_GET['clientId']) ? intval($_GET['clientId']) : 0;
$status   = isset($_GET['status'])   ? trim($_GET['status'])   : '';
$search   = isset($_GET['search'])   ? trim($_GET['search'])   : '';
$from     = isset($_GET['from'])     ? trim($_GET['from'])     : '';
$to       = isset($_GET['to'])       ? trim($_GET['to'])       : '';
$page     = isset($_GET['page'])     ? max(1, intval($_GET['page'])) : 1;
$pageSize = isset($_GET['pageSize']) ? min(200, max(10, intval($_GET['pageSize']))) : 50;
$offset   = ($page - 1) * $pageSize;

$where  = ['1=1'];
$params = [];

if ($type !== '' && $type !== 'all') {
    $where[] = 'type = ?';
    $params[] = $type;
}
if ($clientId > 0) {
    $where[] = 'clientId = ?';
    $params[] = $clientId;
}
if ($status !== '' && $status !== 'all') {
    $where[] = 'status = ?';
    $params[] = $status;
}
if ($search !== '') {
    $where[] = '(recipientName LIKE ? OR recipientEmail LIKE ? OR recipientMobile LIKE ? OR subject LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if ($from !== '') {
    $where[] = 'sentAt >= ?';
    $params[] = $from . ' 00:00:00';
}
if ($to !== '') {
    $where[] = 'sentAt <= ?';
    $params[] = $to . ' 23:59:59';
}

$whereSql = implode(' AND ', $where);

$countStmt = $db->prepare("SELECT COUNT(*) FROM email_log WHERE $whereSql");
$countStmt->execute($params);
$total = intval($countStmt->fetchColumn());

$sql = "SELECT id, clientId, recipientName, recipientEmail, recipientMobile,
               type, subject, status, errorMessage, triggeredBy, sentAt
        FROM email_log
        WHERE $whereSql
        ORDER BY id DESC
        LIMIT $pageSize OFFSET $offset";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'total'    => $total,
    'page'     => $page,
    'pageSize' => $pageSize,
    'rows'     => $rows,
]);
