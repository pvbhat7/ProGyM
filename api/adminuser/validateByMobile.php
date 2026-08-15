<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $data     = json_decode(file_get_contents("php://input"), true);
    $mobile   = isset($data['mobile'])   ? trim($data['mobile'])   : '';
    $password = isset($data['password']) ? trim($data['password']) : '';

    if (!$mobile || !$password) {
        echo json_encode(["valid" => false]);
        exit;
    }

    $stmt = $db->prepare("SELECT id FROM admin_user WHERE mobile = ? AND password = ? LIMIT 1");
    $stmt->execute([$mobile, $password]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode(["valid" => (bool)$row]);
?>
