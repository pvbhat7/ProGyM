<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $name = isset($_GET['name']) ? '%' . $_GET['name'] . '%' : '%';

    $sql = "
        SELECT
            c.id, c.name, c.mobile, c.email, c.gender, c.photo,
            c.profileActiveFlag, c.isGymClient, c.admissionDate,
            c.bloodGroup, c.height, c.weight,
            pd.id          AS pkgId,
            pd.fees        AS pkgFees,
            pd.amountPaid  AS pkgAmountPaid,
            pd.startDate   AS pkgStartDate,
            pd.endDate     AS pkgEndDate,
            pd.status      AS pkgStatus,
            pd.description AS pkgName
        FROM client c
        LEFT JOIN packagedetails pd
            ON pd.clientId = c.id
            AND pd.id = (
                SELECT id FROM packagedetails
                WHERE clientId = c.id
                  AND discontinue != 'true'
                ORDER BY id DESC
                LIMIT 1
            )
        WHERE c.isGymClient = 'yes'
          AND c.discontinue != 'true'
          AND c.name LIKE :name
        ORDER BY c.name ASC
        LIMIT 30
    ";

    $stmt = $db->prepare($sql);
    $stmt->bindParam(':name', $name);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows ?: []);
?>
