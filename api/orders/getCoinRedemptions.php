<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'Pending';

    if ($filter === 'all') {
        $wherePart = "o.paymentStatus = 'ProCoins'";
    } else {
        $wherePart = "o.paymentStatus = 'ProCoins' AND o.status = '" . $filter . "'";
    }

    $sqlQuery = "SELECT o.order_id, o.name AS productName, o.img, o.amount, o.date AS orderDate,
                 o.status, o.paymentStatus, o.proCoinsUsed, o.clientId,
                 c.name AS clientName, c.mobile AS clientMobile, c.photo AS clientPhoto
                 FROM orders o
                 JOIN client c ON c.id = o.clientId
                 WHERE " . $wherePart . "
                 ORDER BY o.order_id DESC";

    $stmt = $db->prepare($sqlQuery);
    $stmt->execute();

    $rows = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $rows[] = array(
            'order_id'      => $row['order_id'],
            'productName'   => $row['productName'],
            'img'           => $row['img'],
            'amount'        => $row['amount'],
            'orderDate'     => $row['orderDate'],
            'status'        => $row['status'],
            'paymentStatus' => $row['paymentStatus'],
            'proCoinsUsed'  => $row['proCoinsUsed'],
            'clientId'      => $row['clientId'],
            'clientName'    => $row['clientName'],
            'clientMobile'  => $row['clientMobile'],
            'clientPhoto'   => $row['clientPhoto'],
        );
    }

    echo json_encode($rows);
?>
