<?php
    // GET — current Razorpay mode for the admin Settings toggle (no secrets returned).
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");

    include_once '../../class/Razorpay.php';

    $cfg = Razorpay::config();
    echo json_encode(array(
        'enabled'        => !empty($cfg['enabled']),
        'mode'           => Razorpay::mode(),
        'liveConfigured' => Razorpay::isConfigured('live'),
        'testConfigured' => Razorpay::isConfigured('test'),
    ));
?>
