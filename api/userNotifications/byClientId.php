<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new UserNotifications($db);

    $item->clientId = isset($_GET['cid']) ? $_GET['cid'] : die();

    $stmt = $item->getByClientId();
    $itemCount = $stmt->rowCount();
    $objArray = array();

    $cnt = 0;
    if($itemCount > 0){
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            $objArray[$cnt] = array(
                "id"        => $row['id'],
                "clientId"  => $row['clientId'],
                "type"      => $row['type'],
                "title"     => $row['title'],
                "message"   => $row['message'],
                "amount"    => $row['amount'],
                "isRead"    => $row['isRead'],
                "createdAt" => $row['createdAt']
            );
            $cnt++;
        }
        echo json_encode($objArray);
    } else {
        echo json_encode(array());
    }
?>
