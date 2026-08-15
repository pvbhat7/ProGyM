<?php
// Knockout Bonanza — a separate prediction track for the last 4 matches
// (M101 SF1, M102 SF2, M103 Third Place, M104 Final). Top 3 win a special reward.
//
// Scoring per match:
//   Winner (advancing team)         5 pts
//   Exact score (FT+ET, no pens)   30 pts
//   First goalscorer               25 pts   (skipped if actual 0-0)
//   Player of the Match            20 pts
//   Per-match max: 80 pts
// Tournament-wide:
//   Perfect Bracket bonus          30 pts   (all 4 winners correct)
//   Tiebreaker: total goals across all 4 matches (closest-to-actual wins)
// Max total: 4 * 80 + 30 = 350 pts

class WcSpecialPrediction {
    private $conn;
    const MATCH_IDS = [101, 102, 103, 104];
    const POINTS_WINNER        = 5;
    const POINTS_SCORE         = 30;
    const POINTS_FIRST_SCORER  = 25;
    const POINTS_MOTM          = 20;
    const POINTS_PERFECT_BRACKET = 30;

    public function __construct($db){
        $this->conn = $db;
    }

    // Users who chose "Leave Tournament" are permanently barred from
    // submitting predictions or a tiebreaker. See wc_special_eliminated.
    public function isEliminated($client_id){
        $client_id = (int)$client_id;
        if ($client_id <= 0) return false;
        $st = $this->conn->prepare("SELECT 1 FROM wc_special_eliminated WHERE client_id = :cid LIMIT 1");
        $st->bindValue(':cid', $client_id, PDO::PARAM_INT);
        $st->execute();
        return (bool)$st->fetchColumn();
    }

    // Insert or update a prediction. Allowed only when the match is upcoming
    // and the prediction window is open (≥15 min before kickoff).
    public function upsertPrediction($client_id, $match_id, $pred_winner, $score_a, $score_b, $first_scorer_id, $motm_id){
        if ($this->isEliminated($client_id)) {
            return ['ok' => false, 'error' => 'You have left the tournament and cannot rejoin.'];
        }
        if (!in_array((int)$match_id, self::MATCH_IDS, true)) {
            return ['ok' => false, 'error' => 'match_id not in Knockout Bonanza set'];
        }
        if (!in_array($pred_winner, ['A','B'], true)) {
            return ['ok' => false, 'error' => 'pred_winner must be A or B'];
        }
        $score_a = (int)$score_a; $score_b = (int)$score_b;
        if ($score_a < 0 || $score_a > 99 || $score_b < 0 || $score_b > 99) {
            return ['ok' => false, 'error' => 'score out of range'];
        }
        // Winner consistency: if score is unequal, declared winner must match higher score.
        // (Equal scores are legal — implies extra-time / penalty winner declared separately.)
        if ($score_a > $score_b && $pred_winner !== 'A') return ['ok' => false, 'error' => 'winner inconsistent with score'];
        if ($score_b > $score_a && $pred_winner !== 'B') return ['ok' => false, 'error' => 'winner inconsistent with score'];
        // 0-0 case: first_scorer must be NULL (no goal to score first).
        if ($score_a + $score_b === 0) {
            $first_scorer_id = null;
        } else {
            if (!$first_scorer_id) return ['ok' => false, 'error' => 'first_scorer_id required when goals > 0'];
            $first_scorer_id = (int)$first_scorer_id;
        }
        if (!$motm_id) return ['ok' => false, 'error' => 'motm_id required'];
        $motm_id = (int)$motm_id;

        // Check match status + lock window
        $m = $this->conn->prepare("SELECT status, kickoff_at FROM wc_matches WHERE id = :id");
        $m->bindValue(':id', (int)$match_id, PDO::PARAM_INT);
        $m->execute();
        $match = $m->fetch(PDO::FETCH_ASSOC);
        if (!$match)                          return ['ok' => false, 'error' => 'match not found'];
        if ($match['status'] !== 'upcoming')  return ['ok' => false, 'error' => 'match not open for predictions'];
        // Lock 15 min before kickoff. kickoff_at is stored in IST clock-time;
        // we compare against NOW() under the same connection timezone (+05:30 from database.php).
        $lockCheck = $this->conn->prepare("SELECT (DATE_SUB(:k, INTERVAL 15 MINUTE) > NOW()) AS open_now");
        $lockCheck->bindValue(':k', $match['kickoff_at']);
        $lockCheck->execute();
        $row = $lockCheck->fetch(PDO::FETCH_ASSOC);
        if (!$row || (int)$row['open_now'] !== 1) return ['ok' => false, 'error' => 'prediction window closed'];

        $sql = "INSERT INTO wc_special_predictions
                  (client_id, match_id, pred_winner, pred_score_a, pred_score_b, pred_first_scorer_id, pred_motm_id, submitted_at)
                VALUES
                  (:cid, :mid, :w, :sa, :sb, :fs, :motm, NOW())
                ON DUPLICATE KEY UPDATE
                  pred_winner          = VALUES(pred_winner),
                  pred_score_a         = VALUES(pred_score_a),
                  pred_score_b         = VALUES(pred_score_b),
                  pred_first_scorer_id = VALUES(pred_first_scorer_id),
                  pred_motm_id         = VALUES(pred_motm_id),
                  updated_at           = NOW()";
        $st = $this->conn->prepare($sql);
        $st->bindValue(':cid',  (int)$client_id, PDO::PARAM_INT);
        $st->bindValue(':mid',  (int)$match_id, PDO::PARAM_INT);
        $st->bindValue(':w',    $pred_winner);
        $st->bindValue(':sa',   $score_a, PDO::PARAM_INT);
        $st->bindValue(':sb',   $score_b, PDO::PARAM_INT);
        $st->bindValue(':fs',   $first_scorer_id, $first_scorer_id === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $st->bindValue(':motm', $motm_id, PDO::PARAM_INT);
        $st->execute();
        return ['ok' => true];
    }

    // Get this user's predictions across the 4 matches.
    public function getUserPredictions($client_id){
        $sql = "SELECT match_id, pred_winner, pred_score_a, pred_score_b, pred_first_scorer_id, pred_motm_id,
                       submitted_at, updated_at,
                       points_winner, points_score, points_first_scorer, points_motm, points_total, settled_at
                FROM wc_special_predictions
                WHERE client_id = :cid AND discontinue != 'true'";
        $st = $this->conn->prepare($sql);
        $st->bindValue(':cid', (int)$client_id, PDO::PARAM_INT);
        $st->execute();
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    // Upsert tournament tiebreaker. Editable until M101 (first SF) locks.
    public function upsertTiebreaker($client_id, $total_goals){
        if ($this->isEliminated($client_id)) {
            return ['ok' => false, 'error' => 'You have left the tournament and cannot rejoin.'];
        }
        $total_goals = (int)$total_goals;
        if ($total_goals < 0 || $total_goals > 40) return ['ok' => false, 'error' => 'total_goals out of range (0-40)'];
        // Check M101 still open
        $st = $this->conn->prepare("SELECT (DATE_SUB(kickoff_at, INTERVAL 15 MINUTE) > NOW()) AS open_now
                                    FROM wc_matches WHERE id = 101");
        $st->execute();
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row || (int)$row['open_now'] !== 1) return ['ok' => false, 'error' => 'tiebreaker window closed (M101 locked)'];

        $sql = "INSERT INTO wc_special_tiebreaker (client_id, total_goals_estimate, submitted_at)
                VALUES (:cid, :g, NOW())
                ON DUPLICATE KEY UPDATE total_goals_estimate = VALUES(total_goals_estimate), updated_at = NOW()";
        $up = $this->conn->prepare($sql);
        $up->bindValue(':cid', (int)$client_id, PDO::PARAM_INT);
        $up->bindValue(':g', $total_goals, PDO::PARAM_INT);
        $up->execute();
        return ['ok' => true];
    }

    public function getUserTiebreaker($client_id){
        $st = $this->conn->prepare("SELECT total_goals_estimate, submitted_at, updated_at
                                    FROM wc_special_tiebreaker WHERE client_id = :cid AND discontinue != 'true'");
        $st->bindValue(':cid', (int)$client_id, PDO::PARAM_INT);
        $st->execute();
        return $st->fetch(PDO::FETCH_ASSOC);
    }

    // Auto-grade all special predictions for one match. Called after wc_matches
    // is marked 'settled' for an M101-M104 row. Idempotent — running twice produces
    // identical results (no double-awarding).
    public function settleAllForMatch($match_id){
        $match_id = (int)$match_id;
        if (!in_array($match_id, self::MATCH_IDS, true)) return ['ok' => true, 'graded' => 0, 'skipped' => 'not in special set'];
        $m = $this->conn->prepare("SELECT status, winner, score_a, score_b, first_scorer_id, motm_id FROM wc_matches WHERE id = :id");
        $m->bindValue(':id', $match_id, PDO::PARAM_INT);
        $m->execute();
        $match = $m->fetch(PDO::FETCH_ASSOC);
        if (!$match || $match['status'] !== 'settled') return ['ok' => false, 'error' => 'match not settled'];

        $aWinner   = $match['winner'];
        $aScoreA   = (int)$match['score_a'];
        $aScoreB   = (int)$match['score_b'];
        $aFirstSc  = $match['first_scorer_id'] !== null ? (int)$match['first_scorer_id'] : null;
        $aMotm     = $match['motm_id'] !== null ? (int)$match['motm_id'] : null;
        $isCleanSheet = ($aScoreA + $aScoreB === 0);

        $preds = $this->conn->prepare("SELECT id, pred_winner, pred_score_a, pred_score_b, pred_first_scorer_id, pred_motm_id
                                       FROM wc_special_predictions WHERE match_id = :mid AND discontinue != 'true'");
        $preds->bindValue(':mid', $match_id, PDO::PARAM_INT);
        $preds->execute();

        $upd = $this->conn->prepare("UPDATE wc_special_predictions
            SET points_winner = :pw, points_score = :ps, points_first_scorer = :pfs, points_motm = :pmotm,
                points_total = :total, settled_at = NOW() WHERE id = :id");

        $graded = 0;
        foreach ($preds->fetchAll(PDO::FETCH_ASSOC) as $p) {
            $pw = ($p['pred_winner'] === $aWinner) ? self::POINTS_WINNER : 0;
            $ps = ((int)$p['pred_score_a'] === $aScoreA && (int)$p['pred_score_b'] === $aScoreB) ? self::POINTS_SCORE : 0;
            if ($isCleanSheet) {
                // No goal happened → first-scorer always 0
                $pfs = 0;
            } else {
                $pfs = ($p['pred_first_scorer_id'] !== null && (int)$p['pred_first_scorer_id'] === $aFirstSc) ? self::POINTS_FIRST_SCORER : 0;
            }
            $pmotm = ($aMotm !== null && (int)$p['pred_motm_id'] === $aMotm) ? self::POINTS_MOTM : 0;
            $total = $pw + $ps + $pfs + $pmotm;
            $upd->bindValue(':pw',    $pw,    PDO::PARAM_INT);
            $upd->bindValue(':ps',    $ps,    PDO::PARAM_INT);
            $upd->bindValue(':pfs',   $pfs,   PDO::PARAM_INT);
            $upd->bindValue(':pmotm', $pmotm, PDO::PARAM_INT);
            $upd->bindValue(':total', $total, PDO::PARAM_INT);
            $upd->bindValue(':id',    (int)$p['id'], PDO::PARAM_INT);
            $upd->execute();
            $graded++;
        }
        return ['ok' => true, 'graded' => $graded, 'match_id' => $match_id];
    }

    // Build current leaderboard. Includes Perfect Bracket bonus (all 4 winners
    // correct) and tiebreaker computation if all 4 matches are settled.
    public function getLeaderboard(){
        // Step 1: aggregate points per client (include unsettled rows so users
        // who have started predicting show up with 0 pts until matches settle)
        $sql = "SELECT sp.client_id,
                       c.name           AS client_name,
                       c.mobile         AS client_mobile,
                       SUM(COALESCE(sp.points_total, 0)) AS total_points,
                       SUM(CASE WHEN sp.points_winner > 0 THEN 1 ELSE 0 END) AS winners_correct,
                       SUM(CASE WHEN sp.settled_at IS NOT NULL THEN 1 ELSE 0 END) AS predictions_settled,
                       COUNT(*)         AS predictions_made
                FROM wc_special_predictions sp
                JOIN client c ON c.id = sp.client_id
                WHERE sp.discontinue != 'true'
                GROUP BY sp.client_id";
        $stmt = $this->conn->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Step 2: total goals across all 4 matches (NULL until all 4 settled)
        $g = $this->conn->query("SELECT COUNT(*) AS n_settled, SUM(score_a + score_b) AS total
                                 FROM wc_matches WHERE id IN (101,102,103,104) AND status = 'settled'");
        $gr = $g->fetch(PDO::FETCH_ASSOC);
        $actualTotal = ((int)$gr['n_settled'] === 4) ? (int)$gr['total'] : null;

        // Step 3: load tiebreaker estimates
        $tb = $this->conn->query("SELECT client_id, total_goals_estimate FROM wc_special_tiebreaker WHERE discontinue != 'true'");
        $tbMap = [];
        foreach ($tb->fetchAll(PDO::FETCH_ASSOC) as $r) $tbMap[(int)$r['client_id']] = (int)$r['total_goals_estimate'];

        // Step 4: enrich + sort
        $out = [];
        foreach ($rows as $r) {
            $cid = (int)$r['client_id'];
            $perfect = ((int)$r['winners_correct'] === 4) ? self::POINTS_PERFECT_BRACKET : 0;
            $total = (int)$r['total_points'] + $perfect;
            $est   = $tbMap[$cid] ?? null;
            $diff  = ($actualTotal !== null && $est !== null) ? abs($actualTotal - $est) : null;
            $out[] = [
                'client_id'        => $cid,
                'client_name'      => $r['client_name'],
                'mobile_masked'    => preg_replace('/^(\d{3})\d{4}(\d{3})$/', '$1XXXX$2', $r['client_mobile']),
                'total_points'     => $total,
                'winners_correct'  => (int)$r['winners_correct'],
                'predictions_settled' => (int)$r['predictions_settled'],
                'predictions_made' => (int)$r['predictions_made'],
                'perfect_bracket'  => $perfect > 0,
                'tiebreaker_estimate' => $est,
                'tiebreaker_diff'  => $diff,
            ];
        }
        // Sort: points DESC, then tiebreaker diff ASC (NULL last), then... we don't have submission time here; tie remains on points if tiebreaker also unavailable
        usort($out, function($x, $y) {
            if ($x['total_points'] !== $y['total_points']) return $y['total_points'] - $x['total_points'];
            $xd = $x['tiebreaker_diff']; $yd = $y['tiebreaker_diff'];
            if ($xd === null && $yd === null) return 0;
            if ($xd === null) return 1;
            if ($yd === null) return -1;
            return $xd - $yd;
        });
        foreach ($out as $i => &$r) $r['rank'] = $i + 1;
        return ['rows' => $out, 'actual_total_goals' => $actualTotal];
    }
}
?>
