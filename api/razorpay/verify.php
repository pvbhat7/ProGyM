<?php
    // POST { razorpay_order_id, razorpay_payment_id, razorpay_signature } — from the checkout handler.
    // Checks the signature, re-fetches the payment from Razorpay, and records it (once).
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/Razorpay.php';

    $database = new Database();
    $db = $database->getConnection();

    $data      = json_decode(file_get_contents("php://input"));
    $orderId   = (string)($data->razorpay_order_id ?? '');
    $paymentId = (string)($data->razorpay_payment_id ?? '');
    $signature = (string)($data->razorpay_signature ?? '');

    try {
        $row = Razorpay::findRow($db, 'rzpOrderId', $orderId);
        if (!$row) throw new Exception('Unknown order');
        if (!Razorpay::checkoutSignatureValid($orderId, $paymentId, $signature, $row['mode'])) {
            throw new Exception('Payment signature invalid');
        }

        $payment = Razorpay::api('GET', 'payments/' . rawurlencode($paymentId), null, $row['mode']);
        if (($payment['order_id'] ?? '') !== $orderId) throw new Exception('Payment does not belong to this order');

        $row = Razorpay::fulfil($db, $row, $payment);
        if ($row['status'] !== 'paid' && $row['status'] !== 'processing') {
            throw new Exception($row['error'] ?: 'Payment could not be recorded');
        }

        echo json_encode(array(
            'ok'                   => true,
            'status'               => $row['status'],
            'amount'               => floatval($row['amount']),
            'packageDetailsId'     => $row['packageDetailsId'] ? intval($row['packageDetailsId']) : null,
            'paymentTransactionId' => $row['paymentTransactionId'] ? intval($row['paymentTransactionId']) : null,
        ));

        if (!empty($row['_fresh'])) {
            WhatsApp::finishResponse();
            Razorpay::sendReceipts($db, $row);
        }
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
    }
?>
