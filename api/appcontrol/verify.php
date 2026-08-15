<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/AppControl.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new AppControl($db);

    $data = json_decode(file_get_contents("php://input"));
    $code = isset($data->passcode) ? $data->passcode : '';

    if ($item->verifyPasscode($code)) {
        $row = $item->getStatus();
        echo json_encode(array(
            "success" => true,
            "token"   => $row['admin_secret'],
            "locked"  => ($row['app_locked'] === 'true')
        ));
    } else {
        http_response_code(401);
        echo json_encode(array(
            "success" => false,
            "message" => "Invalid passcode"
        ));
    }
?>
