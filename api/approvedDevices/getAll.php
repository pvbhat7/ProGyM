<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once '../../class/ApprovedDevice.php';

$database = new Database();
$db = $database->getConnection();

$item = new ApprovedDevice($db);
$stmt = $item->getAll();

$list = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $list[] = [
        "id"           => (int)$row['id'],
        "fingerprint"  => $row['fingerprint'],
        "email"        => $row['email'],
        "label"        => $row['label'],
        "ticket_id"    => $row['ticket_id'],
        "device_info"  => $row['device_info'],
        "ip_address"   => $row['ip_address'],
        "status"       => $row['status'],
        "requested_at" => $row['requested_at'],
        "updated_at"   => $row['updated_at'],
    ];
}

echo json_encode($list);
?>
