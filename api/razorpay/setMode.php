<?php
    // POST { mode: 'test'|'live', pin } — admin Settings toggle. PIN is checked here, not just in the UI:
    // test mode lets anyone "pay" with Razorpay test cards, so flipping it must be protected.
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../class/Razorpay.php';

    $data = json_decode(file_get_contents("php://input"));

    try {
        if (!Razorpay::adminPinValid((string)($data->pin ?? ''))) {
            http_response_code(403);
            echo json_encode(array('ok' => false, 'error' => 'Incorrect PIN'));
            return;
        }
        Razorpay::setMode((string)($data->mode ?? ''));
        echo json_encode(array('ok' => true, 'mode' => Razorpay::mode()));
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
    }
?>
