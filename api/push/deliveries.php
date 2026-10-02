<?php
/**
 * Per-device delivery log for one broadcast.
 *
 * GET ?broadcastId=12
 * → [ { tokenId, clientId, name, mobile, userAgent, status, error, sentAt, deliveredAt, clickedAt }, ... ]
 *
 * status: 'sent' = accepted by Firebase; deliveredAt = phone showed it; clickedAt = member tapped it.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';

$broadcastId = isset($_GET['broadcastId']) ? (int)$_GET['broadcastId'] : 0;
if ($broadcastId <= 0) {
    http_response_code(400);
    echo json_encode(array("message" => "broadcastId required."));
    exit;
}

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare(
    "SELECT l.token_id AS tokenId, l.client_id AS clientId, c.name, c.mobile, t.user_agent AS userAgent,
            l.status, l.error,
            DATE_FORMAT(l.sent_at,      '%d/%m/%Y %h:%i:%s %p') AS sentAt,
            DATE_FORMAT(l.delivered_at, '%d/%m/%Y %h:%i:%s %p') AS deliveredAt,
            DATE_FORMAT(l.clicked_at,   '%d/%m/%Y %h:%i:%s %p') AS clickedAt
     FROM push_delivery_log l
     LEFT JOIN client c      ON c.id = l.client_id
     LEFT JOIN push_tokens t ON t.id = l.token_id
     WHERE l.broadcast_id = ?
     ORDER BY l.status = 'failed' DESC, c.name"
);
$stmt->execute(array($broadcastId));
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
