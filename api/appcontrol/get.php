<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/AppControl.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new AppControl($db);
    $row  = $item->getStatus();

    if ($row) {
        // Only expose the lock flag and timestamp. Never leak passcode/secret.
        echo json_encode(array(
            "locked"    => ($row['app_locked'] === 'true'),
            "locked_at" => $row['locked_at']
        ));
    } else {
        // Fail open — if the table is missing, app stays usable
        echo json_encode(array(
            "locked"    => false,
            "locked_at" => null
        ));
    }
?>
