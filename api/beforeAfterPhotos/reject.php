<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/BeforeAfterPhotos.php';
    include_once '../../class/PhotoRejectionLog.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    $id        = isset($data->id)         ? intval($data->id)        : 0;
    $clientId  = isset($data->clientId)   ? intval($data->clientId)  : 0;
    $weekLabel = isset($data->week_label) ? $data->week_label        : '';

    if (!$id || !$clientId) {
        echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
        exit;
    }

    // Fetch full row from before_after_photos
    $bap     = new BeforeAfterPhotos($db);
    $bap->id = $id;
    $row     = $bap->getById();

    if (!$row) {
        echo json_encode(['status' => 'error', 'message' => 'Entry not found']);
        exit;
    }

    // Fetch client name and before photo path
    $clientStmt = $db->prepare("SELECT name, before_photo_path FROM client WHERE id = ? LIMIT 1");
    $clientStmt->execute([$clientId]);
    $clientRow       = $clientStmt->fetch(PDO::FETCH_ASSOC);
    $clientName      = $clientRow ? $clientRow['name']              : '';
    $beforePhotoPath = $clientRow ? ($clientRow['before_photo_path'] ?? '') : '';

    date_default_timezone_set('Asia/Calcutta');
    $now = date('d-m-Y H:i:s');

    // Log full snapshot into photo_rejection_log
    $log                  = new PhotoRejectionLog($db);
    $log->clientId        = $clientId;
    $log->clientName      = $clientName;
    $log->week_label      = $row['week_label'];
    $log->week_start_date = $row['week_start_date'];
    $log->week_end_date   = $row['week_end_date'];
    $log->before_photo    = $beforePhotoPath;
    $log->after_photo     = $row['after_photo'];
    $log->upload_date     = $row['upload_date'];
    $log->rejected_at     = $now;
    $log->insert();

    // Soft-delete the before_after_photos entry
    if (!$bap->reject()) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to reject entry']);
        exit;
    }

    // Nullify client's before photo so the member can no longer see it
    $db->prepare("UPDATE client SET before_photo_path = NULL WHERE id = ?")->execute([$clientId]);

    // Physical files are kept on disk so admin can view history in the Rejected tab

    $label = $weekLabel ? $weekLabel . ' ' : '';

    $notif            = new UserNotifications($db);
    $notif->clientId  = $clientId;
    $notif->type      = 'photo_rejected';
    $notif->title     = 'Progress Photo Removed';
    $notif->message   = 'Your ' . $label . 'before/after progress photo was removed by the admin as it did not meet the guidelines.';
    $notif->amount    = 0;
    $notif->createdAt = $now;
    $notif->create();

    echo json_encode(['status' => 'success']);
?>
