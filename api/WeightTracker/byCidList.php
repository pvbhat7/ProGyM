<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WeightTracker.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new WeightTracker($db);
    $item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();

    $stmt = $item->getByCid();
    $rows = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $rows[] = [
            "id"     => (int)$row['id'],
            "cid"    => (int)$row['cid'],
            "date"   => $row['date'],
            "weight" => (float)$row['weight']
        ];
    }
    echo json_encode($rows);
?>
