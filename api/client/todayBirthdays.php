<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $today = new DateTime('now', new DateTimeZone('Asia/Calcutta'));
    $d  = $today->format('d'); // with leading zero e.g. "28"
    $d2 = $today->format('j'); // without leading zero e.g. "28" or "8"
    $m  = $today->format('m'); // with leading zero e.g. "04"
    $m2 = $today->format('n'); // without leading zero e.g. "4"

    // Match both padded and unpadded day/month combinations
    // array_values: array_unique keeps original keys, which broke the 1-based bind index
    $patterns = array_values(array_unique([
        "$d/$m/%",
        "$d/$m2/%",
        "$d2/$m/%",
        "$d2/$m2/%",
    ]));

    $sqlQuery = "SELECT id, name, photo, birthDate FROM client
                 WHERE discontinue = 'false'
                 AND (birthDate LIKE " . implode(" OR birthDate LIKE ", array_fill(0, count($patterns), '?')) . ")";

    $stmt = $db->prepare($sqlQuery);
    foreach ($patterns as $i => $p) {
        $stmt->bindValue($i + 1, $p);
    }
    $stmt->execute();

    $result = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $result[] = [
            "id"        => $row['id'],
            "name"      => $row['name'],
            "photo"     => $row['photo'],
            "birthDate" => $row['birthDate'],
        ];
    }

    echo json_encode($result);
?>
