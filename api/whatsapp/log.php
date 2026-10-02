<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';

$db     = (new Database())->getConnection();
$status = isset($_GET['status']) ? trim($_GET['status']) : '';
$limit  = isset($_GET['limit']) ? min(500, max(10, intval($_GET['limit']))) : 100;

$where  = '1=1';
$params = [];
if ($status !== '' && $status !== 'all') {
    $where .= ' AND w.status = ?';
    $params[] = $status;
}

$db->exec("SET NAMES utf8mb4");
$stmt = $db->prepare(
    "SELECT w.id, w.clientId, c.name AS clientName, w.mobile, w.type, w.template, w.params,
            w.status, w.errorMessage, w.sentAt, w.updatedAt
     FROM whatsapp_log w
     LEFT JOIN client c ON c.id = w.clientId
     WHERE $where
     ORDER BY w.id DESC
     LIMIT $limit"
);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$counts = $db->query("SELECT status, COUNT(*) AS n FROM whatsapp_log GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);

echo json_encode(['rows' => $rows, 'counts' => $counts]);
