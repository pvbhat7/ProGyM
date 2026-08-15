<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    $pin_file = __DIR__ . '/../../config/security_pin.txt';
    $stored_pin = file_exists($pin_file) ? trim(file_get_contents($pin_file)) : '1234';

    $data = json_decode(file_get_contents("php://input"));

    if (!$data || !isset($data->pin)) {
        echo json_encode(array("valid" => false, "message" => "PIN is required"));
        exit();
    }

    if ($data->pin === $stored_pin) {
        echo json_encode(array("valid" => true));
    } else {
        echo json_encode(array("valid" => false, "message" => "Incorrect PIN"));
    }
?>
