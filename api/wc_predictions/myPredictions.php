<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcPrediction.php';

    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if ($client_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing or invalid client_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcPrediction($db);
    $stmt = $item->getPredictionsByClientId($client_id);
    $total = $item->getTotalCoinsByClient($client_id);

    $rows = array();
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        $rows[] = array(
            "id"                     => $r['id'],
            "client_id"              => $r['client_id'],
            "match_id"               => $r['match_id'],
            "pred_winner"            => $r['pred_winner'],
            "pred_both_score"        => $r['pred_both_score'],
            "pred_total_goals_range" => $r['pred_total_goals_range'],
            "pred_first_scorer_id"   => $r['pred_first_scorer_id'],
            "pred_first_scorer_name" => $r['pred_first_scorer_name'],
            "pred_motm_id"           => $r['pred_motm_id'],
            "pred_motm_name"         => $r['pred_motm_name'],
            "pred_score_a"           => $r['pred_score_a'],
            "pred_score_b"           => $r['pred_score_b'],
            "coins_awarded"          => $r['coins_awarded'],
            "is_settled"             => $r['is_settled'],
            "submitted_at"           => $r['submitted_at'],
            "settled_at"             => $r['settled_at'],
            // Joined match info
            "match_status"           => $r['match_status'],
            "stage"                  => $r['stage'],
            "multiplier"             => $r['multiplier'],
            "kickoff_at"             => $r['kickoff_at'],
            "winner"                 => $r['winner'],
            "actual_score_a"         => $r['actual_score_a'],
            "actual_score_b"         => $r['actual_score_b'],
            "team_a_name"            => $r['team_a_name'],
            "team_a_code"            => $r['team_a_code'],
            "team_b_name"            => $r['team_b_name'],
            "team_b_code"            => $r['team_b_code']
        );
    }

    echo json_encode(array(
        "client_id"          => $client_id,
        "total_coins_earned" => $total,
        "predictions"        => $rows
    ));
?>
