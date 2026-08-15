<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/ProfilePhotoReview.php';

    $database = new Database();
    $db = $database->getConnection();

    $data     = json_decode(file_get_contents("php://input"));
    $id       = isset($data->id)       ? intval($data->id)      : 0;
    $clientId = isset($data->clientId) ? intval($data->clientId): 0;

    if (!$id || !$clientId) {
        echo json_encode(['status' => 'error', 'message' => 'Missing id or clientId']);
        exit;
    }

    date_default_timezone_set('Asia/Calcutta');

    $review              = new ProfilePhotoReview($db);
    $review->id          = $id;
    $review->reviewed_at = date('d-m-Y H:i:s');

    if (!$review->reject()) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to reject']);
        exit;
    }

    // Nullify the client's profile photo
    $db->prepare("UPDATE client SET photo = NULL WHERE id = ?")->execute([$clientId]);

    echo json_encode(['status' => 'success']);
?>
