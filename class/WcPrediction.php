<?php
class WcPrediction {

    private $conn;
    private $db_table = "wc_predictions";

    public function __construct($db){
        $this->conn = $db;
    }

    // Submit (upsert) a prediction. UNIQUE KEY (client_id, match_id) prevents duplicates;
    // ON DUPLICATE KEY UPDATE refreshes the picks for the same user/match (as long as not yet settled).
    public function submitPrediction(
        $client_id, $match_id,
        $pred_winner, $pred_both_score, $pred_total_goals_range,
        $pred_first_scorer_id, $pred_motm_id,
        $pred_score_a, $pred_score_b
    ){
        $sqlQuery = "INSERT INTO " . $this->db_table . "
                     (client_id, match_id, pred_winner, pred_both_score, pred_total_goals_range,
                      pred_first_scorer_id, pred_motm_id, pred_score_a, pred_score_b,
                      coins_awarded, is_settled, submitted_at)
                     VALUES
                     (:cid, :mid, :pw, :pbs, :ptgr, :pfs, :pmotm, :psa, :psb, 0, 'no', NOW())
                     ON DUPLICATE KEY UPDATE
                       pred_winner            = VALUES(pred_winner),
                       pred_both_score        = VALUES(pred_both_score),
                       pred_total_goals_range = VALUES(pred_total_goals_range),
                       pred_first_scorer_id   = VALUES(pred_first_scorer_id),
                       pred_motm_id           = VALUES(pred_motm_id),
                       pred_score_a           = VALUES(pred_score_a),
                       pred_score_b           = VALUES(pred_score_b),
                       submitted_at           = NOW()";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid',  $client_id, PDO::PARAM_INT);
        $stmt->bindParam(':mid',  $match_id,  PDO::PARAM_INT);
        $stmt->bindParam(':pw',   $pred_winner);
        $stmt->bindParam(':pbs',  $pred_both_score);
        $stmt->bindParam(':ptgr', $pred_total_goals_range);
        $stmt->bindParam(':pfs',  $pred_first_scorer_id, PDO::PARAM_INT);
        $stmt->bindParam(':pmotm',$pred_motm_id,         PDO::PARAM_INT);
        $stmt->bindParam(':psa',  $pred_score_a,         PDO::PARAM_INT);
        $stmt->bindParam(':psb',  $pred_score_b,         PDO::PARAM_INT);
        return $stmt->execute();
    }

    // A user's predictions across matches (used in "My Picks" screen)
    public function getPredictionsByClientId($client_id){
        $sqlQuery = "SELECT p.*,
                            m.kickoff_at, m.status AS match_status, m.stage, m.multiplier,
                            m.winner, m.score_a AS actual_score_a, m.score_b AS actual_score_b,
                            ta.name AS team_a_name, ta.short_code AS team_a_code,
                            tb.name AS team_b_name, tb.short_code AS team_b_code,
                            fs.name AS pred_first_scorer_name,
                            mp.name AS pred_motm_name
                     FROM " . $this->db_table . " p
                     JOIN wc_matches m  ON m.id  = p.match_id
                     JOIN wc_teams   ta ON ta.id = m.team_a_id
                     JOIN wc_teams   tb ON tb.id = m.team_b_id
                     LEFT JOIN wc_players fs ON fs.id = p.pred_first_scorer_id
                     LEFT JOIN wc_players mp ON mp.id = p.pred_motm_id
                     WHERE p.client_id = :cid
                     ORDER BY m.kickoff_at DESC";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Single (client, match) lookup — used to prefill the prediction form
    public function getPrediction($client_id, $match_id){
        $sqlQuery = "SELECT * FROM " . $this->db_table . "
                     WHERE client_id = :cid AND match_id = :mid";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->bindParam(':mid', $match_id,  PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // All predictions for a given match — used by settle logic
    public function getPredictionsByMatchId($match_id){
        $sqlQuery = "SELECT * FROM " . $this->db_table . "
                     WHERE match_id = :mid AND is_settled = 'no'";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':mid', $match_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Write coins awarded to a single prediction row and mark it settled
    public function markPredictionSettled($prediction_id, $coins_awarded){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET coins_awarded = :ca,
                         is_settled    = 'yes',
                         settled_at    = NOW()
                     WHERE id = :id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id', $prediction_id, PDO::PARAM_INT);
        $stmt->bindParam(':ca', $coins_awarded);
        return $stmt->execute();
    }

    // Total coins this user has won across the entire campaign
    public function getTotalCoinsByClient($client_id){
        $sqlQuery = "SELECT COALESCE(SUM(coins_awarded), 0) AS total
                     FROM " . $this->db_table . "
                     WHERE client_id = :cid AND is_settled = 'yes'";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? (float)$row['total'] : 0.0;
    }

    // Used for streak bonus: returns most recent N settled WINNER picks (correct/incorrect flags)
    // for a client, ordered by match kickoff. The settle logic walks this to award streak bonuses.
    public function getRecentWinnerResultsForClient($client_id, $limit){
        $sqlQuery = "SELECT p.pred_winner, m.winner, m.kickoff_at
                     FROM " . $this->db_table . " p
                     JOIN wc_matches m ON m.id = p.match_id
                     WHERE p.client_id = :cid
                       AND p.is_settled = 'yes'
                       AND p.pred_winner IS NOT NULL
                       AND m.winner IS NOT NULL
                     ORDER BY m.kickoff_at DESC
                     LIMIT :lim";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->bindParam(':lim', $limit,     PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }
}
?>
