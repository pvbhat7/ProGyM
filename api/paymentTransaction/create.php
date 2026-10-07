<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/paymenttransaction.php';
    include_once '../../class/PaymentEmail.php';
    include_once '../../class/procointransaction.php';
    include_once '../../class/CoinCreditEvents.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    $proCoinsUsed = isset($data->proCoinsUsed) ? floatval($data->proCoinsUsed) : 0;
    if ($proCoinsUsed < 0) $proCoinsUsed = 0;

    // Server-side: validate coin balance is sufficient
    if ($proCoinsUsed > 0) {
        $balStmt = $db->prepare(
            "SELECT SUM(CASE WHEN creditDebit='1' THEN amount ELSE 0 END) - " .
            "SUM(CASE WHEN creditDebit='2' THEN amount ELSE 0 END) AS balance " .
            "FROM procointransaction WHERE clientId = " . intval($data->clientId)
        );
        $balStmt->execute();
        $balRow = $balStmt->fetch(PDO::FETCH_ASSOC);
        $balance = floatval($balRow['balance'] ?? 0);
        if ($proCoinsUsed > $balance) {
            echo json_encode(["error" => "Insufficient ProCoin balance"]);
            return;
        }
    }

    $item = new paymenttransaction($db);
    $item->packageDetailsId = $data->packageDetailsId;
    $item->feesPaid         = $data->feesPaid;
    $item->paymentDate      = $data->paymentDate;
    $item->isApproved       = $data->isApproved;
    $item->clientGender     = $data->clientGender;
    $item->clientId         = $data->clientId;
    $item->paymentMode      = $data->paymentMode;
    $item->discontinue      = $data->discontinue;
    $item->proCoinsUsed     = $proCoinsUsed;

    $resultId = $item->create();

    date_default_timezone_set('Asia/Calcutta');
    $now = date('d-m-Y H:i:s');
    $today = date('d/m/Y');

    // Debit coins + notify member
    if ($proCoinsUsed > 0) {
        $debit = new procointransaction($db);
        $debit->txnId       = 'PKG' . $data->packageDetailsId . 'TX' . $resultId;
        $debit->des         = 'Package Payment';
        $debit->amount      = $proCoinsUsed;
        $debit->creditDebit = '2';
        $debit->txnDate     = $today;
        $debit->clientId    = $data->clientId;
        $debit->createProcointransactionFromApp();

        $notif          = new UserNotifications($db);
        $notif->clientId = $data->clientId;
        $notif->type     = 'coin_debit';
        $notif->title    = 'ProCoins Used';
        $notif->message  = intval($proCoinsUsed) . ' ProCoins applied toward your package payment';
        $notif->amount   = intval($proCoinsUsed);
        $notif->createdAt = $now;
        $notif->create();
    }

    // Full payment detection: SUM(feesPaid + proCoinsUsed) across all transactions
    $totalStmt = $db->prepare(
        "SELECT SUM(feesPaid + IFNULL(proCoinsUsed, 0)) AS totalPaid " .
        "FROM paymenttransaction WHERE packageDetailsId = " . intval($data->packageDetailsId) .
        " AND discontinue = 'false'"
    );
    $totalStmt->execute();
    $totalRow  = $totalStmt->fetch(PDO::FETCH_ASSOC);
    $totalPaid = floatval($totalRow['totalPaid'] ?? 0);

    $feesStmt = $db->prepare("SELECT fees FROM packagedetails WHERE id = " . intval($data->packageDetailsId));
    $feesStmt->execute();
    $feesRow     = $feesStmt->fetch(PDO::FETCH_ASSOC);
    $packageFees = floatval($feesRow['fees'] ?? 0);

    // Sync parent packagedetails.amountPaid + status from actual txn total.
    // Some FE flows (notably the "Pay" button) previously left status stale — e.g. a
    // package reached fully-paid after several partial payments but status remained
    // 'partial-paid'. Deriving here makes every payment path self-heal.
    if ($packageFees > 0) {
        $derivedStatus = $totalPaid >= $packageFees ? 'fully-paid'
                       : ($totalPaid > 0 ? 'partial-paid' : 'not paid');
    } else {
        $derivedStatus = $totalPaid > 0 ? 'fully-paid' : 'not paid';
    }
    $syncStmt = $db->prepare(
        "UPDATE packagedetails SET amountPaid = :paid, status = :status WHERE id = :id"
    );
    $syncStmt->execute([
        ':paid'   => $totalPaid,
        ':status' => $derivedStatus,
        ':id'     => intval($data->packageDetailsId),
    ]);

    if ($packageFees > 0 && $totalPaid >= $packageFees) {
        $events             = new CoinCreditEvents($db);
        $events->clientId   = $data->clientId;
        $events->eventType  = 'full_payment';
        $events->referenceId = $data->packageDetailsId;

        if (!$events->existsForReference()) {
            $rules             = new CoinEarningRules($db);
            $rules->eventType  = 'full_payment';
            $ruleStmt          = $rules->getByEventType();
            $rule              = $ruleStmt->fetch(PDO::FETCH_ASSOC);

            if ($rule) {
                $coinAmt = intval($rule['coinAmount']);

                $credit             = new procointransaction($db);
                $credit->txnId      = 'FULLPAY' . $data->packageDetailsId;
                $credit->des        = 'Full Payment Bonus';
                $credit->amount     = $coinAmt;
                $credit->creditDebit = '1';
                $credit->txnDate    = $today;
                $credit->clientId   = $data->clientId;
                $credit->createProcointransactionFromApp();

                $events->coinAmount = $coinAmt;
                $events->createdAt  = $now;
                $events->create();

                $fullNotif           = new UserNotifications($db);
                $fullNotif->clientId = $data->clientId;
                $fullNotif->type     = 'coin_credit';
                $fullNotif->title    = 'Full Payment Bonus!';
                $fullNotif->message  = 'You earned ' . $coinAmt . ' ProCoins for completing your package payment!';
                $fullNotif->amount   = $coinAmt;
                $fullNotif->createdAt = $now;
                $fullNotif->create();
            }
        }
    }

    // Send payment confirmation email (skipped silently if client has no email)
    PaymentEmail::send(
        $db,
        (int) $data->clientId,
        (int) $data->packageDetailsId,
        floatval($data->feesPaid) + $proCoinsUsed,
        $data->paymentDate,
        (int) $resultId
    );

    echo $resultId;
    return $resultId;
?>
