<?php
    // Returns the football-coin transaction history for a client.
    // Currently only credit rows exist (from settled predictions). The response
    // shape includes "type" (credit/debit) and a description so debit flows
    // can be added later without breaking the frontend.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if ($client_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing or invalid client_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $sql = "SELECT p.id              AS prediction_id,
                   p.coins_awarded,
                   p.settled_at,
                   m.kickoff_at,
                   m.score_a         AS actual_score_a,
                   m.score_b         AS actual_score_b,
                   ta.name           AS team_a_name,
                   ta.short_code     AS team_a_code,
                   tb.name           AS team_b_name,
                   tb.short_code     AS team_b_code
            FROM wc_predictions p
            JOIN wc_matches m  ON m.id  = p.match_id
            JOIN wc_teams   ta ON ta.id = m.team_a_id
            JOIN wc_teams   tb ON tb.id = m.team_b_id
            WHERE p.client_id  = :cid
              AND p.is_settled = 'yes'
            ORDER BY p.settled_at DESC, p.id DESC";
    $stmt = $db->prepare($sql);
    $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
    $stmt->execute();

    $txns      = array();
    $totalCred = 0.0;
    $totalDeb  = 0.0;

    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        $amount = (float)$r['coins_awarded'];
        $type   = $amount > 0 ? 'credit' : 'zero';
        if ($type === 'credit') $totalCred += $amount;

        $desc = "Prediction reward · " . $r['team_a_code'] . " vs " . $r['team_b_code'];
        if ($r['actual_score_a'] !== null && $r['actual_score_b'] !== null){
            $desc .= " (" . $r['actual_score_a'] . "-" . $r['actual_score_b'] . ")";
        }

        $txns[] = array(
            "id"            => "pred_" . $r['prediction_id'],
            "type"          => $type,
            "amount"        => $amount,
            "description"   => $desc,
            "date"          => $r['settled_at'] ?: $r['kickoff_at'],
            "team_a_name"   => $r['team_a_name'],
            "team_a_code"   => $r['team_a_code'],
            "team_b_name"   => $r['team_b_name'],
            "team_b_code"   => $r['team_b_code'],
            "actual_score_a"=> $r['actual_score_a'],
            "actual_score_b"=> $r['actual_score_b']
        );
    }

    echo json_encode(array(
        "client_id"     => $client_id,
        "total_credits" => $totalCred,
        "total_debits"  => $totalDeb,
        "balance"       => $totalCred - $totalDeb,
        "transactions"  => $txns
    ));
?>
