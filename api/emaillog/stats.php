<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$from = isset($_GET['from']) ? trim($_GET['from']) : '';
$to   = isset($_GET['to'])   ? trim($_GET['to'])   : '';

$where  = ['1=1'];
$params = [];
if ($from !== '') { $where[] = 'sentAt >= ?'; $params[] = $from . ' 00:00:00'; }
if ($to   !== '') { $where[] = 'sentAt <= ?'; $params[] = $to   . ' 23:59:59'; }
$whereSql = implode(' AND ', $where);

$stmt = $db->prepare(
    "SELECT type,
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'sent'   THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
     FROM email_log
     WHERE $whereSql
     GROUP BY type"
);
$stmt->execute($params);
$byType = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalStmt = $db->prepare(
    "SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'sent'   THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
     FROM email_log
     WHERE $whereSql"
);
$totalStmt->execute($params);
$overall = $totalStmt->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'sent' => 0, 'failed' => 0];

echo json_encode([
    'overall' => $overall,
    'byType'  => $byType,
]);
