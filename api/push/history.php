<?php
/**
 * Last 50 admin broadcasts with delivery stats.
 *   pushSent   = accepted by Firebase
 *   delivered  = phone confirmed it showed the notification (service-worker receipt)
 *   clicked    = member tapped it
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$stmt = $db->query(
    "SELECT b.id, b.title, b.message, b.image, b.link, b.audience, b.audience_value AS audienceValue,
            b.recipients, b.devices, b.push_sent AS pushSent, b.push_failed AS pushFailed,
            b.created_by AS createdBy, DATE_FORMAT(b.created_at, '%d/%m/%Y %h:%i %p') AS createdAt,
            c.name AS clientName,
            (SELECT COUNT(*) FROM push_delivery_log l WHERE l.broadcast_id = b.id AND l.delivered_at IS NOT NULL) AS delivered,
            (SELECT COUNT(*) FROM push_delivery_log l WHERE l.broadcast_id = b.id AND l.clicked_at   IS NOT NULL) AS clicked
     FROM push_broadcasts b
     LEFT JOIN client c ON b.audience = 'client' AND c.id = b.audience_value
     ORDER BY b.id DESC LIMIT 50"
);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
