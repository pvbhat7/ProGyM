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
$item->fingerprint = isset($_GET['fingerprint']) ? trim($_GET['fingerprint']) : '';

if (empty($item->fingerprint)) {
    http_response_code(400);
    echo json_encode(["message" => "Fingerprint required."]);
    exit;
}

$stmt = $item->checkStatus();

if ($stmt->rowCount() > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode([
        "found"       => true,
        "status"      => $row['status'],
        "email"       => $row['email'],
        "ticket_id"   => $row['ticket_id'],
        "device_info" => $row['device_info'],
        "requested_at"=> $row['requested_at'],
        "updated_at"  => $row['updated_at'],
    ]);
} else {
    echo json_encode(["found" => false, "status" => "not_found"]);
}
?>
