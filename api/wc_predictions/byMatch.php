<?php
    // Admin-facing: all predictions submitted for a given match. Used by the
    // admin "Settle Match" screen to show how many users predicted and what they picked.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcPrediction.php';

    $match_id = isset($_GET['match_id']) ? (int)$_GET['match_id'] : 0;
    if ($match_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing or invalid match_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    // Fetch all predictions for this match with the client name joined for display.
    $sql = "SELECT p.id, p.client_id, p.pred_winner, p.pred_both_score, p.pred_total_goals_range,
                   p.pred_first_scorer_id, p.pred_motm_id, p.pred_score_a, p.pred_score_b,
                   p.coins_awarded, p.is_settled, p.submitted_at, p.settled_at,
                   c.name AS client_name, c.mobile AS client_mobile
            FROM wc_predictions p
            LEFT JOIN client c ON c.id = p.client_id
            WHERE p.match_id = :mid
            ORDER BY p.submitted_at ASC";
    $stmt = $db->prepare($sql);
    $stmt->bindParam(':mid', $match_id, PDO::PARAM_INT);
    $stmt->execute();

    $rows = array();
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        $rows[] = $r;
    }

    echo json_encode(array(
        "match_id"        => $match_id,
        "total_predictions" => count($rows),
        "predictions"     => $rows
    ));
?>
