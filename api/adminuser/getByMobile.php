<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $mobile = isset($_GET['mobile']) ? trim($_GET['mobile']) : die(json_encode(["id" => null]));

    $stmt = $db->prepare("SELECT id, name, mobile, authorizedToApprovePayment FROM admin_user WHERE mobile = ? LIMIT 1");
    $stmt->execute([$mobile]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode($row ?: ["id" => null]);
?>
