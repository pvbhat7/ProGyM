<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare(
    "SELECT
        p.clientId,
        COALESCE(c.name, CONCAT('Member #', p.clientId)) AS clientName,
        SUM(CASE WHEN p.creditDebit = '1' THEN CAST(p.amount AS DECIMAL(10,2)) ELSE 0 END) AS totalCredited,
        SUM(CASE WHEN p.creditDebit = '2' THEN CAST(p.amount AS DECIMAL(10,2)) ELSE 0 END) AS totalRedeemed,
        SUM(CASE WHEN p.creditDebit = '1' THEN CAST(p.amount AS DECIMAL(10,2))
                 ELSE -CAST(p.amount AS DECIMAL(10,2)) END) AS balance
     FROM procointransaction p
     LEFT JOIN client c ON c.id = CAST(p.clientId AS UNSIGNED)
     GROUP BY p.clientId, c.name
     ORDER BY totalCredited DESC"
);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
?>
