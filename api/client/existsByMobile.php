<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $mobile = isset($_GET['mobile']) ? trim($_GET['mobile']) : '';
    if (!$mobile) {
        echo json_encode(["id" => 0, "is_wc_participant" => false]);
        exit;
    }

    // Look up the client and (in the same query) check whether they're already
    // a wc2026 campaign participant. The wc2026 signup screen uses
    // is_wc_participant to decide whether to surface the referral-code field —
    // returning users can't trigger referral credit, so hiding the field for
    // them avoids confusion.
    $stmt = $db->prepare(
        "SELECT c.id, c.name,
                (CASE WHEN wp.client_id IS NULL THEN 0 ELSE 1 END) AS is_wc_participant
         FROM client c
         LEFT JOIN wc_participants wp ON wp.client_id = c.id
         WHERE c.mobile = ? AND c.discontinue != 'true'
         LIMIT 1"
    );
    $stmt->execute([$mobile]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row){
        echo json_encode(["id" => 0, "is_wc_participant" => false]);
        exit;
    }

    echo json_encode([
        "id"                => (int)$row['id'],
        "name"              => $row['name'],
        "is_wc_participant" => ((int)$row['is_wc_participant']) === 1
    ]);
?>
