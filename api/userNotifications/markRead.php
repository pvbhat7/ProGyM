<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new UserNotifications($db);

    $data = json_decode(file_get_contents("php://input"));

    // Mark all for a client, or a single notification by id
    if(isset($data->clientId)){
        $item->clientId = $data->clientId;
        if($item->markAllReadByClientId()){
            echo json_encode(array("success" => true));
        } else {
            echo json_encode(array("success" => true)); // nothing to mark = still ok
        }
    } else if(isset($data->id)){
        $item->id = $data->id;
        if($item->markRead()){
            echo json_encode(array("success" => true));
        } else {
            http_response_code(500);
            echo json_encode(array("success" => false));
        }
    } else {
        http_response_code(400);
        echo json_encode(array("success" => false, "message" => "clientId or id required."));
    }
?>
