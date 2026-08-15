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

    $data = json_decode(file_get_contents("php://input"));

    if (!$data || !isset($data->currentPin) || !isset($data->newPin)) {
        echo json_encode(array("success" => false, "message" => "Missing required fields"));
        exit();
    }

    $current_stored = file_exists($pin_file) ? trim(file_get_contents($pin_file)) : '1234';

    if ($data->currentPin !== $current_stored) {
        echo json_encode(array("success" => false, "message" => "Current PIN is incorrect"));
        exit();
    }

    if (!preg_match('/^\d{4}$/', $data->newPin)) {
        echo json_encode(array("success" => false, "message" => "New PIN must be exactly 4 digits"));
        exit();
    }

    if (file_put_contents($pin_file, $data->newPin) === false) {
        echo json_encode(array("success" => false, "message" => "Failed to save PIN"));
        exit();
    }

    echo json_encode(array("success" => true));
?>
