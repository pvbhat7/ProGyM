<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/client.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/CoinCreditEvents.php';
    include_once '../../class/UserNotifications.php';
    include_once '../../class/ProfilePhotoReview.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Client($db);

    $data = json_decode(file_get_contents("php://input"));
    $item->id    = $data->id;
    $item->photo = $data->photo;

    $newPhotoUploaded = false;

    $b64 = $data->photo;
    if (strpos($b64, 'http') != false) {
        // already a URL — no new upload
    } else {
        if ($b64 != '') {
            $id_   = $data->id;
            $name_ = $data->name;
            $bin   = base64_decode($b64);
            $im    = imageCreateFromString($bin);
            if (!$im) {
                die('Base64 value is not a valid image');
            }
            $fName            = $data->id . $data->name . "_" . time() . ".png";
            $img_file         = '../../../profilePictures/' . $fName;
            imagepng($im, $img_file, 0);
            $tavrosImagePath  = 'https://tavrostechinfo.com/PROGYM/profilePictures/' . $fName;
            $item->photo      = $tavrosImagePath;
            $newPhotoUploaded = true;
        } else {
            $item->photo = $data->photo;
        }
    }

    $updated = $item->updateProfilePhoto();

    // --- Profile Pic ProCoin (once in a lifetime) ---
    if ($newPhotoUploaded && $updated) {
        $clientId = intval($data->id ?? 0);
        if ($clientId > 0) {
            date_default_timezone_set('Asia/Calcutta');
            $now   = date('d-m-Y H:i:s');
            $today = date('d/m/Y');

            $event            = new CoinCreditEvents($db);
            $event->clientId  = $clientId;
            $event->eventType = 'profile_pic';

            if (!$event->existsEver()) {
                $rule            = new CoinEarningRules($db);
                $rule->eventType = 'profile_pic';
                $ruleStmt        = $rule->getByEventType();
                $ruleRow         = $ruleStmt->fetch(PDO::FETCH_ASSOC);

                if ($ruleRow) {
                    $coinAmount = intval($ruleRow['coinAmount']);
                    $txnId      = 'PROFPIC-' . $clientId . '-' . date('YmdHis');

                    $db->prepare(
                        "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
                         VALUES (?, ?, ?, '1', ?, ?)"
                    )->execute([$txnId, 'Profile Picture Update', $coinAmount, $today, $clientId]);

                    $event->coinAmount  = $coinAmount;
                    $event->eventDate   = '';
                    $event->eventMonth  = '';
                    $event->referenceId = '';
                    $event->createdAt   = $now;
                    $event->create();

                    $notif            = new UserNotifications($db);
                    $notif->clientId  = $clientId;
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
    if ($newPhotoUploaded && $updated) {
        date_default_timezone_set('Asia/Calcutta');
        $nameRow = $db->prepare("SELECT name FROM client WHERE id = ? LIMIT 1");
        $nameRow->execute([intval($data->id)]);
        $nr = $nameRow->fetch(PDO::FETCH_ASSOC);

        $ppr              = new ProfilePhotoReview($db);
        $ppr->clientId    = intval($data->id);
        $ppr->clientName  = $nr ? $nr['name'] : '';
        $ppr->photo_path  = $tavrosImagePath;
        $ppr->uploaded_at = date('d-m-Y H:i:s');
        $ppr->insert();
    }
    // --- end Profile Photo Review ---

    echo json_encode(array("result" => $tavrosImagePath));
?>