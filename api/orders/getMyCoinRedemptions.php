<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $clientId = isset($_GET['clientId']) ? $_GET['clientId'] : '';

    $sqlQuery = "SELECT order_id, name, img, date, status, amount, paymentStatus, proCoinsUsed, trackingDetails
                 FROM orders
                 WHERE clientId = '" . $clientId . "'
                   AND paymentStatus = 'ProCoins'
                 ORDER BY order_id DESC";

    $stmt = $db->prepare($sqlQuery);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows);
?>
