<?php
// WhatsApp broadcast history with delivery stats (delivered/read come from the webhook via whatsapp_log)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';

$db = (new Database())->getConnection();
$db->exec("SET NAMES utf8mb4");

$rows = $db->query(
    "SELECT b.id, b.push_broadcast_id AS pushBroadcastId, b.title, b.message, b.image, b.audience,
            b.audience_value AS audienceValue, c.name AS clientName, b.created_by AS createdBy, b.created_at AS createdAt,
            b.total, b.skipped, b.sent, b.failed, b.status,
            (SELECT COUNT(*) FROM whatsapp_queue q WHERE q.broadcast_id = b.id AND q.status = 'pending') AS pending,
            (SELECT COUNT(*) FROM whatsapp_queue q JOIN whatsapp_log l ON l.wamid = q.wamid
              WHERE q.broadcast_id = b.id AND l.status IN ('delivered', 'read')) AS delivered,
            (SELECT COUNT(*) FROM whatsapp_queue q JOIN whatsapp_log l ON l.wamid = q.wamid
              WHERE q.broadcast_id = b.id AND l.status = 'read') AS readCount,
            (SELECT COUNT(*) FROM whatsapp_queue q JOIN whatsapp_log l ON l.wamid = q.wamid
              WHERE q.broadcast_id = b.id AND l.status = 'failed') AS failedAfterSend,
            (SELECT q.error FROM whatsapp_queue q WHERE q.broadcast_id = b.id AND q.status = 'failed' ORDER BY q.id DESC LIMIT 1) AS lastError
     FROM whatsapp_broadcasts b
     LEFT JOIN client c ON b.audience = 'client' AND c.id = b.audience_value
     ORDER BY b.id DESC
     LIMIT 50"
)->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['broadcasts' => $rows]);
