<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"), true);

    $id  = isset($data['id'])  ? (int)$data['id']          : 0;
    $awp = isset($data['awp']) ? trim($data['awp'])         : '';

    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "id is required"]);
        exit;
    }

    $stmt = $db->prepare("UPDATE client SET awp=? WHERE id=?");
    $ok = $stmt->execute([$awp, $id]);

    echo json_encode(["message" => $ok ? "Workout plan updated" : "Update failed"]);
?>
