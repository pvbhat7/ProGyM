<?php
    // POST { clientId, purpose: 'renew'|'balance', packageId?, packageDetailsId? }
    // Creates a Razorpay order for the in-app checkout. Amount comes from Razorpay::quote().
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/Razorpay.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));
    $rowId = 0;

    try {
        if (!Razorpay::memberPaymentsOn()) throw new Exception('Online payments are not available yet');
        $q = Razorpay::quote($db,
            intval($data->clientId ?? 0),
            (string)($data->purpose ?? ''),
            intval($data->packageId ?? 0),
            intval($data->packageDetailsId ?? 0)
        );
        $client = Razorpay::getClient($db, $q['clientId']);

        $rowId = Razorpay::insertRow($db, 'checkout', $q, 'member');
        $order = Razorpay::api('POST', 'orders', array(
            'amount'   => intval(round($q['amount'] * 100)),
            'currency' => 'INR',
            'receipt'  => 'pg_' . $rowId,
            'notes'    => array('clientId' => (string)$q['clientId'], 'purpose' => $q['purpose'], 'rowId' => (string)$rowId),
        ));
        $db->prepare("UPDATE razorpay_payments SET rzpOrderId = ? WHERE id = ?")->execute(array($order['id'], $rowId));

        $keys = Razorpay::keys();
        echo json_encode(array(
            'ok'          => true,
            'keyId'       => $keys['key_id'],
            'orderId'     => $order['id'],
            'amount'      => $order['amount'],
            'currency'    => 'INR',
            'description' => $q['description'],
            'startDate'   => $q['startDate'] ?? null,
            'endDate'     => $q['endDate'] ?? null,
            'prefill'     => array(
                'name'    => $client['name'],
                'contact' => $client['mobile'],
                'email'   => $client['email'],
            ),
        ));
    } catch (Throwable $e) {
        if ($rowId) Razorpay::markFailed($db, $rowId, $e->getMessage());
        http_response_code(400);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
    }
?>
