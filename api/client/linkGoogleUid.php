<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->clientId) || !isset($data->googleUid) || !$data->clientId || !$data->googleUid) {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }

    $stmt = $db->prepare("UPDATE client SET googleUid = ? WHERE id = ? AND discontinue != 'true'");
    $stmt->execute([$data->googleUid, (int)$data->clientId]);

    echo json_encode($stmt->rowCount() > 0 ? ["success" => true] : ["success" => false, "message" => "Client not found"]);
?>
