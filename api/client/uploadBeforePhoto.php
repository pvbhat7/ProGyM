<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    $clientId    = isset($data->clientId) ? intval($data->clientId) : 0;
    $photoBase64 = isset($data->photo)    ? $data->photo            : '';

    if (!$clientId || !$photoBase64) {
        echo json_encode(['status' => 'error', 'message' => 'Missing clientId or photo']);
        exit;
    }

    // Strip data-URI prefix if present (e.g. "data:image/jpeg;base64,")
    $photoBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $photoBase64);

    $uploadDir = '../../uploads/before_after/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filename = 'before_' . $clientId . '_' . time() . '.jpg';
    $filePath = $uploadDir . $filename;

    if (file_put_contents($filePath, base64_decode($photoBase64)) === false) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save image']);
        exit;
    }

    $relativePath = 'uploads/before_after/' . $filename;

    $stmt = $db->prepare("UPDATE client SET before_photo_path = ? WHERE id = ?");
    $stmt->execute([$relativePath, $clientId]);

    echo json_encode(['status' => 'success', 'path' => $relativePath]);
?>
