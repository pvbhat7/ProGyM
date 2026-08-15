<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/client.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Client($db);

    $stmt = $item->getAllClientsForReferrals();
    $itemCount = $stmt->rowCount();
    $objArray = array();

    if($itemCount > 0){
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            $objArray[] = array(
                "id"                => $row['id'],
                "name"              => $row['name'],
                "mobile"            => $row['mobile'],
                "gender"            => $row['gender'],
                "profileActiveFlag" => $row['profileActiveFlag'],
                "isGymClient"       => $row['isGymClient'],
                "discontinue"       => $row['discontinue'],
                "reference"         => $row['reference'],
                "referPoints"       => $row['referPoints'],
                "admissionDate"     => $row['admissionDate']
            );
        }
        echo json_encode($objArray);
    } else {
        echo json_encode(array());
    }
?>
