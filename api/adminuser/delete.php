<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"), true);
    $id = isset($data['id']) ? (int)$data['id'] : 0;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "id is required"]);
        exit;
    }

    $stmt = $db->prepare("DELETE FROM admin_user WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Deleted"]);
?>
