<?php
    // Razorpay webhook. Configure in Dashboard → Settings → Webhooks with events:
    //   payment.authorized, payment.captured — in-app checkout (backup if the browser closed
    //                        before verify.php ran; fulfil() captures authorized payments)
    //   payment_link.paid  — admin payment links
    // Secret must match webhook_secret in secure_keys/razorpay.json.
    header("Content-Type: application/json; charset=UTF-8");

    include_once '../../config/database.php';
    include_once '../../class/Razorpay.php';

    $raw = file_get_contents("php://input");
    $sig = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

    try {
        if (!Razorpay::webhookSignatureValid($raw, $sig)) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'error' => 'bad signature'));
            return;
        }
    } catch (Throwable $e) {
        http_response_code(503);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
        return;
    }

    $database = new Database();
    $db = $database->getConnection();

    $evt     = json_decode($raw, true);
    $event   = $evt['event'] ?? '';
    $payment = $evt['payload']['payment']['entity'] ?? null;
    $row     = null;

    if (($event === 'payment.captured' || $event === 'payment.authorized') && $payment && !empty($payment['order_id'])) {
        $row = Razorpay::findRow($db, 'rzpOrderId', $payment['order_id']);
        if ($row && $row['kind'] !== 'checkout') $row = null;   // link payments are handled by payment_link.paid
    } elseif ($event === 'payment_link.paid' && $payment) {
        $linkId = $evt['payload']['payment_link']['entity']['id'] ?? '';
        $row = $linkId ? Razorpay::findRow($db, 'rzpLinkId', $linkId) : null;
    }

    if (!$row) {   // not ours (or an event we don't handle) — acknowledge so Razorpay doesn't retry
        echo json_encode(array('ok' => true, 'ignored' => true));
        return;
    }

    try {
        $row = Razorpay::fulfil($db, $row, $payment);
        echo json_encode(array('ok' => true, 'status' => $row['status']));
        if (!empty($row['_fresh'])) {
            WhatsApp::finishResponse();
            Razorpay::sendReceipts($db, $row);
        }
    } catch (Throwable $e) {
        // 500 → Razorpay retries; fulfil() already recorded the error on the row.
        http_response_code(500);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
    }
?>
