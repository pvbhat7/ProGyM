<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    $path = __DIR__ . '/../../config/features.json';
    $data = file_exists($path) ? json_decode(file_get_contents($path), true) : [];

    $input = json_decode(file_get_contents("php://input"), true);

    // Merge incoming keys into existing config
    foreach ($input as $key => $value) {
        $data[$key] = $value;
    }

    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));

    echo json_encode(["success" => true, "features" => $data]);
?>
