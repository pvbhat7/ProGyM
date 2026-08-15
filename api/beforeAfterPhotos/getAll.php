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

    $bap  = new BeforeAfterPhotos($db);
    $stmt = $bap->getAll();

    $photos = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $photos[] = $row;
    }

    echo json_encode($photos);
?>
