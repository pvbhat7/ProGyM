<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    // The PIN itself is no longer returned — this endpoint was public, which let anyone
    // read it and bypass the Add Client gate. Use validateSecurityPin.php to check a PIN.
    $pin_file = __DIR__ . '/../../config/security_pin.txt';
    echo json_encode(array("set" => file_exists($pin_file)));
?>
