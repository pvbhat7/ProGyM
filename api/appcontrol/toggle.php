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

    $data   = json_decode(file_get_contents("php://input"));
    $token  = isset($data->token)  ? $data->token  : '';
    $locked = isset($data->locked) ? $data->locked : false;

    if ($item->setLocked($locked, $token)) {
        $row = $item->getStatus();
        echo json_encode(array(
            "success"   => true,
            "locked"    => ($row['app_locked'] === 'true'),
            "locked_at" => $row['locked_at']
        ));
    } else {
        http_response_code(403);
        echo json_encode(array(
            "success" => false,
            "message" => "Forbidden"
        ));
    }
?>
