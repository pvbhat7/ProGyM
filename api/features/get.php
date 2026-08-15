<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");

    $path = __DIR__ . '/../../config/features.json';
    $data = file_exists($path) ? json_decode(file_get_contents($path), true) : [];

    echo json_encode($data);
?>
