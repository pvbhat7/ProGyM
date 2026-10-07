<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/attendance.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/CoinCreditEvents.php';
    include_once '../../class/UserNotifications.php';
    include_once '../../class/WhatsApp.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new attendance($db);

    $item->cid = isset($_GET['cid']) ? $_GET['cid'] : die();

    $resultId = $item->create();

    // --- Attendance ProCoin (once per calendar day) ---
    $clientId = intval($item->cid);
    if ($clientId > 0) {
        date_default_timezone_set('Asia/Calcutta');
        $now   = date('d-m-Y H:i:s');
        $today = date('d/m/Y');

        $event            = new CoinCreditEvents($db);
        $event->clientId  = $clientId;
        $event->eventType = 'attendance';
        $event->eventDate = $today;

        if (!$event->existsForDay()) {
            $rule            = new CoinEarningRules($db);
            $rule->eventType = 'attendance';
            $ruleStmt        = $rule->getByEventType();
            $ruleRow         = $ruleStmt->fetch(PDO::FETCH_ASSOC);

            if ($ruleRow && $ruleRow['isActive'] === 'yes') {
                $coinAmount = intval($ruleRow['coinAmount']);
                $txnId      = 'ATTEND-' . $clientId . '-' . date('YmdHis');

                $db->prepare(
                    "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
                     VALUES (?, ?, ?, '1', ?, ?)"
                )->execute([$txnId, 'Daily Attendance Check-in', $coinAmount, $today, $clientId]);

                $event->coinAmount  = $coinAmount;
                $event->eventMonth  = '';
                $event->referenceId = '';
                $event->createdAt   = $now;
                $event->create();

                $notif            = new UserNotifications($db);
                $notif->clientId  = $clientId;
                $notif->type      = 'coin_credit';
                $notif->title     = 'Attendance Bonus';
                $notif->message   = 'You earned ' . $coinAmount . ' ProCoin for marking attendance today!';
                $notif->amount    = $coinAmount;
                $notif->createdAt = $now;
                $notif->create();
            }
        }
    }
    // --- end ProCoin logic ---

    echo $resultId;

    // Admin WhatsApp alert — after the response is sent so check-in stays fast
    WhatsApp::finishResponse();
    WhatsApp::attendanceAlert($db, $clientId);

    return $resultId;
	
?>