<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$today = date('d/m/Y');

$s = $db->prepare(
    "SELECT DISTINCT clientId FROM procointransaction
     WHERE des LIKE 'Birthday Gift%' AND txnDate = ?"
);
$s->execute([$today]);
$rows = $s->fetchAll(PDO::FETCH_COLUMN);

echo json_encode(['clientIds' => array_map('intval', $rows)]);
?>
