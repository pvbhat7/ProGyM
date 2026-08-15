<?php
/**
 * Tournament-end "Major Awards" predictions.
 *
 * One submission per client (enforced by UNIQUE KEY on client_id).
 * Locked forever once submitted — no updates allowed.
 *
 * Points:
 *   Winner correct       : +100
 *   Golden Ball correct  : +50
 *   Golden Boot correct  : +50
 *   Golden Glove correct : +50
 *   Max possible         : 250
 */

if (!defined('WC_AWARD_WINNER_COINS'))     define('WC_AWARD_WINNER_COINS',     100);
if (!defined('WC_AWARD_GOLDEN_BALL_COINS'))  define('WC_AWARD_GOLDEN_BALL_COINS',  50);
if (!defined('WC_AWARD_GOLDEN_BOOT_COINS'))  define('WC_AWARD_GOLDEN_BOOT_COINS',  50);
if (!defined('WC_AWARD_GOLDEN_GLOVE_COINS')) define('WC_AWARD_GOLDEN_GLOVE_COINS', 50);

class WcTournamentPrediction {

    private $conn;
    private $db_table = "wc_tournament_predictions";

    public function __construct($db){
        $this->conn = $db;
    }

    public function getByClientId($client_id){
        $sql = "SELECT p.*,
                       wt.name       AS winner_team_name,
                       wt.short_code AS winner_team_code,
                       wt.flag       AS winner_team_flag,
                       bp.name       AS golden_ball_player_name,
                       bt.name       AS golden_ball_team_name,
                       bt.short_code AS golden_ball_team_code,
                       op.name       AS golden_boot_player_name,
                       ot.name       AS golden_boot_team_name,
                       ot.short_code AS golden_boot_team_code,
                       gp.name       AS golden_glove_player_name,
                       gt.name       AS golden_glove_team_name,
                       gt.short_code AS golden_glove_team_code
                FROM " . $this->db_table . " p
                LEFT JOIN wc_teams   wt ON wt.id = p.pred_winner_team_id
                LEFT JOIN wc_players bp ON bp.id = p.pred_golden_ball_player_id
                LEFT JOIN wc_teams   bt ON bt.id = bp.team_id
                LEFT JOIN wc_players op ON op.id = p.pred_golden_boot_player_id
                LEFT JOIN wc_teams   ot ON ot.id = op.team_id
                LEFT JOIN wc_players gp ON gp.id = p.pred_golden_glove_player_id
                LEFT JOIN wc_teams   gt ON gt.id = gp.team_id
                WHERE p.client_id = :cid
                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function submit($client_id, $winner_team_id, $ball_player_id, $boot_player_id, $glove_player_id){
        $sql = "INSERT INTO " . $this->db_table . "
                (client_id, pred_winner_team_id, pred_golden_ball_player_id,
                 pred_golden_boot_player_id, pred_golden_glove_player_id, submitted_at)
                VALUES (:cid, :w, :ball, :boot, :glove, NOW())";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':cid',   $client_id,       PDO::PARAM_INT);
        $stmt->bindParam(':w',     $winner_team_id,  PDO::PARAM_INT);
        $stmt->bindParam(':ball',  $ball_player_id,  PDO::PARAM_INT);
        $stmt->bindParam(':boot',  $boot_player_id,  PDO::PARAM_INT);
        $stmt->bindParam(':glove', $glove_player_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Admin path: declares the 4 actual results and awards coins to every matching pick.
    public function settleAll($actual_winner_team_id, $actual_ball_player_id, $actual_boot_player_id, $actual_glove_player_id){
        $sql = "SELECT id, client_id,
                       pred_winner_team_id, pred_golden_ball_player_id,
                       pred_golden_boot_player_id, pred_golden_glove_player_id
                FROM " . $this->db_table . "
                WHERE settled_at IS NULL";
        $stmt = $this->conn->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $upd = $this->conn->prepare(
            "UPDATE " . $this->db_table . "
                SET coins_awarded   = :coins,
                    winner_correct  = :wc,
                    ball_correct    = :bc,
                    boot_correct    = :oc,
                    glove_correct   = :gc,
                    settled_at      = NOW()
              WHERE id = :id"
        );

        $totals = array(
            'users_awarded'     => 0,
            'coins_distributed' => 0,
            'per_user'          => array(),
        );

        foreach ($rows as $r) {
            $coins = 0;
            $wc = $bc = $oc = $gc = 'no';

            if ((int)$r['pred_winner_team_id']         === (int)$actual_winner_team_id) { $coins += WC_AWARD_WINNER_COINS;     $wc = 'yes'; }
            if ((int)$r['pred_golden_ball_player_id']  === (int)$actual_ball_player_id) { $coins += WC_AWARD_GOLDEN_BALL_COINS;  $bc = 'yes'; }
            if ((int)$r['pred_golden_boot_player_id']  === (int)$actual_boot_player_id) { $coins += WC_AWARD_GOLDEN_BOOT_COINS;  $oc = 'yes'; }
            if ((int)$r['pred_golden_glove_player_id'] === (int)$actual_glove_player_id) { $coins += WC_AWARD_GOLDEN_GLOVE_COINS; $gc = 'yes'; }

            $id = (int)$r['id'];
            $upd->bindParam(':coins', $coins, PDO::PARAM_INT);
            $upd->bindParam(':wc',    $wc);
            $upd->bindParam(':bc',    $bc);
            $upd->bindParam(':oc',    $oc);
            $upd->bindParam(':gc',    $gc);
            $upd->bindParam(':id',    $id, PDO::PARAM_INT);
            $upd->execute();

            // Roll up into wc_participants.total_coins_earned (mirrors per-match flow).
            if ($coins > 0) {
                $top = $this->conn->prepare(
                    "UPDATE wc_participants
                        SET total_coins_earned = COALESCE(total_coins_earned, 0) + :c
                      WHERE client_id = :cid"
                );
                $top->bindParam(':c',   $coins,           PDO::PARAM_INT);
                $top->bindParam(':cid', $r['client_id'],  PDO::PARAM_INT);
                $top->execute();

                $totals['users_awarded']++;
                $totals['coins_distributed'] += $coins;
                $totals['per_user'][] = array(
                    'client_id' => (int)$r['client_id'],
                    'coins'     => $coins,
                );
            }
        }
        return $totals;
    }
}
?>
