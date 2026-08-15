<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->order_id)) {
        http_response_code(400);
        echo json_encode(array("success" => false, "message" => "order_id required"));
        exit;
    }

    $orderId = (int)$data->order_id;

    $fetchStmt = $db->prepare(
        "SELECT o.order_id, o.name AS productName, o.img, o.proCoinsUsed, o.clientId
         FROM orders o WHERE o.order_id = ?"
    );
    $fetchStmt->execute(array($orderId));
    $order = $fetchStmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(404);
        echo json_encode(array("success" => false, "message" => "Order not found"));
        exit;
    }

    $updateStmt = $db->prepare("UPDATE orders SET status = 'Delivered' WHERE order_id = ?");
    $updateStmt->execute(array($orderId));

    $now = date("d-m-Y H:i:s");
    $notifMsg = "Your redemption for " . $order['productName'] . " has been marked as collected. Enjoy!";
    $notifStmt = $db->prepare(
        "INSERT INTO user_notifications (clientId, type, title, message, amount, isRead, createdAt, discontinue)
         VALUES (?, 'merchandise_collected', 'Redemption Collected', ?, ?, 'no', ?, 'false')"
    );
    $notifStmt->execute(array($order['clientId'], $notifMsg, $order['proCoinsUsed'], $now));

    $tokenStmt = $db->prepare(
        "SELECT f.token FROM fcmToken f JOIN client c ON c.mobile = f.mobile WHERE c.id = ? ORDER BY f.id DESC LIMIT 1"
    );
    $tokenStmt->execute(array($order['clientId']));
    $tokenRow = $tokenStmt->fetch(PDO::FETCH_ASSOC);

    if ($tokenRow && !empty($tokenRow['token'])) {
        $apiKey = "AAAArT6uHZ8:APA91bG2R01CatD2LOa-1dePZEQu0rZ3cioXD0CR53iWrBKdfP0zFxWYU4OYjIHHGQewA8oR3WLoIc_5aUN6EwQys6DDzzx_msYNwD0LTcq8PJ9jqifeIMgeMpYl9-5ON5ZOgwZSzlvi";
        $headers = array('Authorization:key=' . $apiKey, 'Content-Type:application/json');
        $apiBody = array(
            'notification' => array(
                'title' => 'Redemption Collected',
                'body'  => $notifMsg,
                'image' => $order['img'],
                'click_action' => 'activities.NotifHandlerActivity'
            ),
            'data' => array('notificationType' => 'collapsed'),
            'time_to_live' => 600,
            'to' => $tokenRow['token']
        );
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://fcm.googleapis.com/fcm/send');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($apiBody));
        curl_exec($ch);
        curl_close($ch);
    }

    echo json_encode(array("success" => true));
?>
