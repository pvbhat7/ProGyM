<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    $pin_file = __DIR__ . '/../../config/security_pin.txt';

    if (!file_exists($pin_file)) {
        echo json_encode(array("pin" => "1234"));
        exit();
    }

    $pin = trim(file_get_contents($pin_file));
    echo json_encode(array("pin" => $pin));
?>
