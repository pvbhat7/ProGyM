<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->query("SELECT id, days, fees, gender, description FROM packages ORDER BY gender ASC, days ASC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
?>
