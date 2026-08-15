<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WeightTracker.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/CoinCreditEvents.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new WeightTracker($db);

    $data = json_decode(file_get_contents("php://input"));

    $item->cid    = $data->cid;
    $item->date   = $data->date;
    $item->weight = $data->weight;

    if($item->add()){

        // --- Weight Log ProCoin (once per calendar week) ---
        $clientId = intval($data->cid ?? 0);
        if ($clientId > 0) {
            date_default_timezone_set('Asia/Calcutta');
            $now = date('d-m-Y H:i:s');
            $today = date('d/m/Y');

            // Monday of the current ISO week (1=Mon … 7=Sun)
            $dayOfWeek    = intval(date('N'));
            $weekStartTs  = strtotime('-' . ($dayOfWeek - 1) . ' days');
            $weekStartDate = date('d/m/Y', $weekStartTs);

            $event            = new CoinCreditEvents($db);
            $event->clientId  = $clientId;
            $event->eventType = 'weight_log';
            $event->eventDate = $weekStartDate;

            if (!$event->existsForWeek()) {
                $rule            = new CoinEarningRules($db);
                $rule->eventType = 'weight_log';
                $ruleStmt        = $rule->getByEventType();
                $ruleRow         = $ruleStmt->fetch(PDO::FETCH_ASSOC);

                if ($ruleRow) {
                    $coinAmount = intval($ruleRow['coinAmount']);
                    $txnId      = 'WEIGHT-' . $clientId . '-' . date('YmdHis');

                    $db->prepare(
                        "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
                         VALUES (?, ?, ?, '1', ?, ?)"
                    )->execute([$txnId, 'Weight Tracker Update', $coinAmount, $today, $clientId]);

                    $event->coinAmount = $coinAmount;
                    $event->eventMonth = '';
                    $event->referenceId = '';
                    $event->createdAt  = $now;
                    $event->create();

                    $notif            = new UserNotifications($db);
                    $notif->clientId  = $clientId;
                    $notif->type      = 'coin_credit';
                    $notif->title     = 'Weight Log Bonus';
                    $notif->message   = 'You earned ' . $coinAmount . ' ProCoins for logging your weight this week!';
                    $notif->amount    = $coinAmount;
                    $notif->createdAt = $now;
                    $notif->create();
                }
            }
        }
        // --- end ProCoin logic ---

        echo 'added successfully.';
    } else{
        echo 'error';
    }

?>