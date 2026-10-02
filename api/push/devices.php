<?php
/**
 * Registered push devices + summary.
 *
 * → {
 *     "summary": { "activeDevices": 12, "activeMembers": 10, "inactiveDevices": 3 },
 *     "devices": [ { id, clientId, name, mobile, userAgent, isActive, createdAt, lastSeenAt,
 *                    sent, delivered, clicked }, ... ]
 *   }
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$summary = $db->query(
    "SELECT SUM(is_active = 'yes') AS activeDevices,
            COUNT(DISTINCT CASE WHEN is_active = 'yes' THEN client_id END) AS activeMembers,
            SUM(is_active != 'yes') AS inactiveDevices
     FROM push_tokens"
)->fetch(PDO::FETCH_ASSOC);

$devices = $db->query(
    "SELECT t.id, t.client_id AS clientId, c.name, c.mobile, t.user_agent AS userAgent,
            t.is_active AS isActive,
            DATE_FORMAT(t.created_at,   '%d/%m/%Y %h:%i %p') AS createdAt,
            DATE_FORMAT(t.last_seen_at, '%d/%m/%Y %h:%i %p') AS lastSeenAt,
            COUNT(l.id)                       AS sent,
            COUNT(l.delivered_at)             AS delivered,
            COUNT(l.clicked_at)               AS clicked
     FROM push_tokens t
     LEFT JOIN client c ON c.id = t.client_id
     LEFT JOIN push_delivery_log l ON l.token_id = t.id AND l.status = 'sent'
     GROUP BY t.id
     ORDER BY t.is_active = 'yes' DESC, t.last_seen_at DESC
     LIMIT 500"
)->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(array(
    "summary" => array(
        "activeDevices"   => (int)$summary['activeDevices'],
        "activeMembers"   => (int)$summary['activeMembers'],
        "inactiveDevices" => (int)$summary['inactiveDevices'],
    ),
    "devices" => $devices,
));
?>
