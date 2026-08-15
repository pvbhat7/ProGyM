<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/BeforeAfterPhotos.php';

    $database = new Database();
    $db = $database->getConnection();

    $clientId = isset($_GET['cid']) ? intval($_GET['cid']) : 0;

    if (!$clientId) {
        echo json_encode([]);
        exit;
    }

    $bap           = new BeforeAfterPhotos($db);
    $bap->clientId = $clientId;
    $stmt          = $bap->getByClientId();

    $photos = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $photos[] = $row;
    }

    echo json_encode($photos);
?>
