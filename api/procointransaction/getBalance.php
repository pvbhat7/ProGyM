<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $clientId = isset($_GET['clientId']) ? intval($_GET['clientId']) : 0;

    $stmt = $db->prepare(
        "SELECT SUM(CASE WHEN creditDebit='1' THEN amount ELSE 0 END) - " .
        "SUM(CASE WHEN creditDebit='2' THEN amount ELSE 0 END) AS balance " .
        "FROM procointransaction WHERE clientId = " . $clientId
    );
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $balance = floatval($row['balance'] ?? 0);
    if ($balance < 0) $balance = 0;

    echo json_encode(["balance" => $balance]);
?>
