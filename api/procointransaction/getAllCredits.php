<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare(
    "SELECT p.id, p.txnId, p.des, p.amount, p.txnDate, p.clientId,
            COALESCE(c.name, 'Unknown') AS clientName
     FROM procointransaction p
     LEFT JOIN client c ON c.id = CAST(p.clientId AS UNSIGNED)
     WHERE p.creditDebit = '1'
     ORDER BY p.id DESC"
);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
?>
