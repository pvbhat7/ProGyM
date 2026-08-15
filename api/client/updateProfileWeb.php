<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

    include_once '../../config/database.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/CoinCreditEvents.php';
    include_once '../../class/UserNotifications.php';
    include_once '../../class/ProfilePhotoReview.php';
    $database = new Database();
    $db = $database->getConnection();

    $data      = json_decode(file_get_contents("php://input"), true);
    $id        = isset($data['id'])        ? (int)$data['id']        : 0;
    $name      = isset($data['name'])      ? trim($data['name'])      : '';
    $email     = isset($data['email'])     ? trim($data['email'])     : '';
    $birthDate = isset($data['birthDate']) ? trim($data['birthDate']) : '';
    $address   = isset($data['address'])   ? trim($data['address'])   : '';
    $height    = isset($data['height'])    ? (float)$data['height']   : 0;
    $weight    = isset($data['weight'])    ? (float)$data['weight']   : 0;
    $photoData = isset($data['photo'])     ? $data['photo']           : '';

    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "id is required"]);
        exit;
    }

    // Fetch current photo to preserve it when no new photo sent
    $cur = $db->prepare("SELECT photo FROM client WHERE id = ?");
    $cur->execute([$id]);
    $curRow = $cur->fetch(PDO::FETCH_ASSOC);
    $currentPhoto = $curRow ? $curRow['photo'] : '';

    $photoUrl         = $currentPhoto;
    $newPhotoUploaded = false;

    if ($photoData !== '') {
        if (substr($photoData, 0, 4) === 'http') {
            $photoUrl = $photoData;
        } else {
            $bin = base64_decode($photoData, true);
            if ($bin !== false) {
                $im = @imageCreateFromString($bin);
                if ($im) {
                    $fName    = $id . $name . "_" . time() . ".png";
                    $img_file = '../../../profilePictures/' . $fName;
                    imagepng($im, $img_file, 0);
                    imagedestroy($im);
                    $photoUrl = 'https://tavrostechinfo.com/PROGYM/profilePictures/' . $fName;
                    $newPhotoUploaded = true;
                }
            }
        }
    }

    $stmt = $db->prepare("UPDATE client SET birthDate=?, address=?, height=?, weight=?, photo=? WHERE id=?");
    $ok = $stmt->execute([$birthDate, $address, $height, $weight, $photoUrl, $id]);

    // --- Profile Pic ProCoin (once in a lifetime) ---
    if ($newPhotoUploaded && $ok) {
        if ($id > 0) {
            date_default_timezone_set('Asia/Calcutta');
            $now   = date('d-m-Y H:i:s');
            $today = date('d/m/Y');

            $event            = new CoinCreditEvents($db);
            $event->clientId  = $id;
            $event->eventType = 'profile_pic';

            if (!$event->existsEver()) {
                $rule            = new CoinEarningRules($db);
                $rule->eventType = 'profile_pic';
                $ruleStmt        = $rule->getByEventType();
                $ruleRow         = $ruleStmt->fetch(PDO::FETCH_ASSOC);

                if ($ruleRow) {
                    $coinAmount = intval($ruleRow['coinAmount']);
                    $txnId      = 'PROFPIC-' . $id . '-' . date('YmdHis');

                    $db->prepare(
                        "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
                         VALUES (?, ?, ?, '1', ?, ?)"
                    )->execute([$txnId, 'Profile Picture Update', $coinAmount, $today, $id]);

                    $event->coinAmount  = $coinAmount;
                    $event->eventDate   = '';
                    $event->eventMonth  = '';
                    $event->referenceId = '';
                    $event->createdAt   = $now;
                    $event->create();

                    $notif            = new UserNotifications($db);
                    $notif->clientId  = $id;
                    $notif->type      = 'coin_credit';
                    $notif->title     = 'Profile Picture Bonus';
                    $notif->message   = 'You earned ' . $coinAmount . ' ProCoins for updating your profile picture!';
                    $notif->amount    = $coinAmount;
                    $notif->createdAt = $now;
                    $notif->create();
                }
            }
        }
    }
    // --- end ProCoin logic ---

    // --- Profile Photo Review ---
    if ($newPhotoUploaded && $ok) {
        $nameRow = $db->prepare("SELECT name FROM client WHERE id = ? LIMIT 1");
        $nameRow->execute([$id]);
        $nr = $nameRow->fetch(PDO::FETCH_ASSOC);

        $ppr              = new ProfilePhotoReview($db);
        $ppr->clientId    = $id;
        $ppr->clientName  = $nr ? $nr['name'] : '';
        $ppr->photo_path  = $photoUrl;
        $ppr->uploaded_at = isset($now) ? $now : date('d-m-Y H:i:s');
        $ppr->insert();
    }
    // --- end Profile Photo Review ---

    echo json_encode(["message" => $ok ? "Profile updated" : "Update failed", "photo" => $photoUrl]);
?>
