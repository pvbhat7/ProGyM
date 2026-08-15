<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/BeforeAfterPhotos.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    $clientId    = isset($data->clientId)        ? intval($data->clientId)       : 0;
    $week_label  = isset($data->week_label)       ? $data->week_label             : '';
    $week_start  = isset($data->week_start_date)  ? $data->week_start_date        : '';
    $week_end    = isset($data->week_end_date)    ? $data->week_end_date          : '';
    $photoBase64 = isset($data->after_photo)      ? $data->after_photo            : '';

    if (!$clientId || !$week_label || !$week_start || !$photoBase64) {
        echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
        exit;
    }

    // Strip data-URI prefix if present
    $photoBase64 = preg_replace('/^data:image\/\w+;base64,/', '', $photoBase64);

    $uploadDir = '../../uploads/before_after/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $safeLabel = preg_replace('/[^a-z0-9]/i', '_', $week_label);
    $filename  = 'after_' . $clientId . '_' . $safeLabel . '_' . time() . '.jpg';
    $filePath  = $uploadDir . $filename;

    if (file_put_contents($filePath, base64_decode($photoBase64)) === false) {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save image']);
        exit;
    }

    $relativePath = 'uploads/before_after/' . $filename;

    date_default_timezone_set('Asia/Calcutta');
    $now   = date('d-m-Y H:i:s');
    $today = date('d/m/Y');

    $bap             = new BeforeAfterPhotos($db);
    $bap->clientId   = $clientId;
    $bap->week_label = $week_label;

    $existing      = $bap->existsForWeek();
    $coinsCredited = false;

    if ($existing) {
        // Re-upload same week — delete old file, replace photo only, no coin
        $oldFile = '../../' . $existing['after_photo'];
        if (!empty($existing['after_photo']) && file_exists($oldFile)) {
            unlink($oldFile);
        }
        $bap->after_photo  = $relativePath;
        $bap->upload_date  = $now;
        $bap->updatePhoto();
    } else {
        // New week slot — insert row and credit coins
        $bap->week_start_date = $week_start;
        $bap->week_end_date   = $week_end;
        $bap->after_photo     = $relativePath;
        $bap->upload_date     = $now;
        $bap->coins_credited  = 'yes';
        $bap->upload();

        $rule            = new CoinEarningRules($db);
        $rule->eventType = 'before_after_photo';
        $ruleStmt        = $rule->getByEventType();
        $ruleRow         = $ruleStmt->fetch(PDO::FETCH_ASSOC);

        if ($ruleRow && $ruleRow['isActive'] === 'yes') {
            $coinAmount = intval($ruleRow['coinAmount']);
            $txnId      = 'PHOTO-' . $clientId . '-' . date('YmdHis');

            $db->prepare(
                "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
                 VALUES (?, ?, ?, '1', ?, ?)"
            )->execute([$txnId, 'Weekly Progress Photo - ' . $week_label, $coinAmount, $today, $clientId]);

            $notif           = new UserNotifications($db);
            $notif->clientId = $clientId;
            $notif->type     = 'coin_credit';
            $notif->title    = 'Progress Photo Bonus';
            $notif->message  = 'You earned ' . $coinAmount . ' ProCoins for uploading your ' . $week_label . ' progress photo!';
            $notif->amount   = $coinAmount;
            $notif->createdAt = $now;
            $notif->create();

            $coinsCredited = true;
        }
    }

    echo json_encode([
        'status'        => 'success',
        'path'          => $relativePath,
        'isNewWeek'     => !$existing,
        'coinsCredited' => $coinsCredited,
    ]);
?>
