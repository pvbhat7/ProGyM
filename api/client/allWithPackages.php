<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $source = isset($_GET['source']) ? $_GET['source'] : 'gym';

    if ($source === 'wc_campaign') {
        $whereClient = "c.creationSource = 'wc_campaign' AND c.discontinue != 'true'";
    } else {
        $whereClient = "c.isGymClient = 'yes' AND c.discontinue != 'true'";
    }

    // Single query: each client joined with their most recent package
    $sql = "
        SELECT
            c.id, c.name, c.mobile, c.email, c.gender, c.photo,
            c.profileActiveFlag, c.isGymClient, c.creationSource, c.admissionDate,
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
        WHERE $whereClient
        ORDER BY c.name ASC
    ";

    $stmt = $db->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($rows ?: []);
?>
