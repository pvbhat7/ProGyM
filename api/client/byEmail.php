<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    if (!$email) {
        echo json_encode(["id" => 0]);
        exit;
    }

    $stmt = $db->prepare("SELECT id, name, mobile FROM client WHERE email = ? AND discontinue != 'true' LIMIT 1");
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode($row ? ["id" => (int)$row['id'], "name" => $row['name'], "mobile" => $row['mobile']] : ["id" => 0]);
?>
