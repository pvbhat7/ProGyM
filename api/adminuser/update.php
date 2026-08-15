<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $data     = json_decode(file_get_contents("php://input"), true);
    $id       = isset($data['id'])       ? (int)$data['id']       : 0;
    $name     = isset($data['name'])     ? trim($data['name'])     : '';
    $username = isset($data['username']) ? trim($data['username']) : '';
    $mobile   = isset($data['mobile'])   ? trim($data['mobile'])   : '';
    $password = isset($data['password']) ? trim($data['password']) : '';
    $authPay  = isset($data['authorizedToApprovePayment']) ? $data['authorizedToApprovePayment'] : 'NO';

    if (!$id || !$name || !$username || !$mobile) {
        http_response_code(400);
        echo json_encode(["message" => "id, name, username and mobile are required"]);
        exit;
    }

    $chk = $db->prepare("SELECT id FROM admin_user WHERE mobile = ? AND id != ?");
    $chk->execute([$mobile, $id]);
    if ($chk->fetch()) {
        http_response_code(409);
        echo json_encode(["message" => "Mobile already registered as another admin"]);
        exit;
    }

    if ($password) {
        $stmt = $db->prepare("UPDATE admin_user SET name=?, username=?, mobile=?, password=?, authorizedToApprovePayment=? WHERE id=?");
        $stmt->execute([$name, $username, $mobile, $password, $authPay, $id]);
    } else {
        $stmt = $db->prepare("UPDATE admin_user SET name=?, username=?, mobile=?, authorizedToApprovePayment=? WHERE id=?");
        $stmt->execute([$name, $username, $mobile, $authPay, $id]);
    }
    echo json_encode(["message" => "Updated"]);
?>
