<?php
/**
 * Shared scoring engine used by both:
 *   - api/wc_matches/settle.php          (admin manual settle)
 *   - api/wc_cron/autoSettleFromEspn.php (overnight auto-settle from ESPN)
 *
 * Holds the per-component coin values, the streak rules, and the routine
 * that walks every prediction for a match and awards the right footballs.
 *
 * Football → gym discount conversion is intentionally NOT handled here —
 * settled awards only land in wc_predictions.coins_awarded and the
 * denormalized wc_participants.total_coins_earned. See settle.php header.
 */

// Per-match base = 20 (Winner 5 + Both-score 2 + MOTM 5 + Exact-score 8).
// total-goals-range and first-scorer are no longer awarded (kept at 0 so legacy
// rows with these picks settle cleanly without paying out).
if (!defined('WC_COIN_WINNER')) {
    define('WC_COIN_WINNER',       5);
    define('WC_COIN_BOTH_SCORE',   2);
    define('WC_COIN_TOTAL_GOALS',  0);
    define('WC_COIN_FIRST_SCORER', 0);
    define('WC_COIN_MOTM',         5);
    define('WC_COIN_EXACT_SCORE',  8);
}

class WcScoringHelper {

    // Derive total-goals-range bucket from the numeric total.
    public static function totalGoalsBucket($total){
        if ($total <= 2) return 'UNDER_2_5';
        if ($total <= 4) return 'MID';     // 3 or 4
        return 'OVER_4_5';                 // 5+
    }

    /**
     * The actual scoring engine. Walks every unsettled prediction for a
     * match, awards footballs, writes to wc_predictions and wc_participants,
     * and flips wc_matches to 'settled' with the supplied result fields.
     *
     * Caller is responsible for opening a transaction (and committing /
     * rolling back). This function will throw on errors.
     *
     * $motm_id and $first_scorer_id may be NULL — in that case any user who
     * predicted them simply scores 0 on that line. (Top-up later if needed.)
     *
     * Returns:
     *   array(
     *     'predictions_settled' => int,
     *     'users_awarded'       => int,
     *     'coins_distributed'   => float,
     *     'per_user'            => array(
     *        ['prediction_id', 'client_id', 'base', 'after_x',
     *         'streak_bonus', 'new_streak', 'coins', 'detail']
     *     )
     *   )
     */
    public static function settleMatchPredictions(
        PDO $db,
        $match_id,
        $winner,
        $score_a,
        $score_b,
        $first_scorer_id,   // nullable
        $motm_id            // nullable
    ){
        // Load the match (need multiplier + integrity check).
        require_once __DIR__ . '/WcMatch.php';
        require_once __DIR__ . '/WcPrediction.php';
        require_once __DIR__ . '/WcParticipant.php';

        $matchObj = new WcMatch($db);
        $match    = $matchObj->getMatchById($match_id);
        if (!$match) {
            throw new Exception("Match not found.");
        }
        if ($match['status'] === 'settled') {
            throw new Exception("Match already settled.");
        }

        $total_goals       = $score_a + $score_b;
        $total_goals_range = self::totalGoalsBucket($total_goals);
        $both_teams_scored = ($score_a > 0 && $score_b > 0) ? 'YES' : 'NO';
        // Stage multiplier removed — every match is flat 20 base. The column
        // remains in the table (always 1) so legacy reports keep working.
        $multiplier        = 1.0;

        // 1) Flip the match.
        $matchObj->markMatchSettled(
            $match_id, $winner, $score_a, $score_b,
            $first_scorer_id, $motm_id,
            $total_goals_range, $both_teams_scored
        );

        // 1a) The "next upcoming" match has just rolled forward — clear all per-match
        // reminder timestamps so the admin's pending list resets for the new fixture.
        $partResetObj = new WcParticipant($db);
        $partResetObj->resetMatchReminders();

        // 2) Walk every unsettled prediction.
        $predObj = new WcPrediction($db);
        $partObj = new WcParticipant($db);
        $stmt    = $predObj->getPredictionsByMatchId($match_id);

        $settledCount      = 0;
        $coinsDistributed  = 0.0;
        $usersAwarded      = 0;
        $reportRows        = array();

        while ($p = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $pid       = (int)$p['id'];
            $client_id = (int)$p['client_id'];

            $base   = 0;
            $detail = array();

            if ($p['pred_winner'] !== null && strtoupper($p['pred_winner']) === $winner) {
                $base += WC_COIN_WINNER; $detail[] = 'winner';
            }
            if ($p['pred_both_score'] !== null && strtoupper($p['pred_both_score']) === $both_teams_scored) {
                $base += WC_COIN_BOTH_SCORE; $detail[] = 'both-score';
            }
            if ($p['pred_total_goals_range'] !== null && strtoupper($p['pred_total_goals_range']) === $total_goals_range) {
                $base += WC_COIN_TOTAL_GOALS; $detail[] = 'total-goals';
            }
            if ($first_scorer_id !== null && $p['pred_first_scorer_id'] !== null && (int)$p['pred_first_scorer_id'] === (int)$first_scorer_id) {
                $base += WC_COIN_FIRST_SCORER; $detail[] = 'first-scorer';
            }
            if ($motm_id !== null && $p['pred_motm_id'] !== null && (int)$p['pred_motm_id'] === (int)$motm_id) {
                $base += WC_COIN_MOTM; $detail[] = 'motm';
            }
            if ($p['pred_score_a'] !== null && $p['pred_score_b'] !== null &&
                (int)$p['pred_score_a'] === (int)$score_a && (int)$p['pred_score_b'] === (int)$score_b) {
                $base += WC_COIN_EXACT_SCORE; $detail[] = 'exact-score';
            }

            // No stage multiplier — coins awarded equals base (capped at 20).
            $afterMultiplier = $base;
            $coinsAwarded    = $base;

            $predObj->markPredictionSettled($pid, $coinsAwarded);
            $settledCount++;

            $partObj->incrementStats($client_id, $coinsAwarded, 1);

            if ($coinsAwarded > 0) {
                $usersAwarded++;
                $coinsDistributed += $coinsAwarded;
            }

            $reportRows[] = array(
                "prediction_id" => $pid,
                "client_id"     => $client_id,
                "base"          => $base,
                "after_x"       => $afterMultiplier,
                "coins"         => $coinsAwarded,
                "detail"        => $detail,
            );
        }

        return array(
            "predictions_settled" => $settledCount,
            "users_awarded"       => $usersAwarded,
            "coins_distributed"   => $coinsDistributed,
            "per_user"            => $reportRows,
            "match_label"         => $match['team_a_name'] . ' vs ' . $match['team_b_name'],
            "team_a_name"         => $match['team_a_name'],
            "team_b_name"         => $match['team_b_name'],
            "multiplier"          => $multiplier,
        );
    }

    /**
     * Top-up MOTM bonus AFTER an espn_partial settlement. For every
     * prediction on this match where the user picked the right MOTM,
     * adds (WC_COIN_MOTM * match.multiplier) footballs to:
     *   - wc_predictions.coins_awarded
     *   - wc_participants.total_coins_earned
     *
     * Also writes wc_matches.motm_id so the result is captured.
     *
     * Caller wraps in a transaction. Idempotency must be enforced upstream
     * (e.g. by checking result_source = 'espn_partial' before calling).
     *
     * Returns array of awarded rows.
     */
    public static function topUpMotmForMatch(PDO $db, $match_id, $motm_id){
        // Verify the match exists. Stage multiplier removed — flat MOTM bonus.
        $stmt = $db->prepare("SELECT id FROM wc_matches WHERE id = :id");
        $stmt->bindParam(':id', $match_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new Exception("Match not found.");
        $bonus = WC_COIN_MOTM;

        // Predictions that named this MOTM correctly
        $stmt = $db->prepare(
            "SELECT id, client_id
               FROM wc_predictions
              WHERE match_id = :mid
                AND is_settled = 'yes'
                AND pred_motm_id = :motm"
        );
        $stmt->bindParam(':mid',  $match_id, PDO::PARAM_INT);
        $stmt->bindParam(':motm', $motm_id,  PDO::PARAM_INT);
        $stmt->execute();
        $hits = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $awarded = array();
        if (count($hits) > 0) {
            $bumpPred = $db->prepare(
                "UPDATE wc_predictions
                    SET coins_awarded = coins_awarded + :b
                  WHERE id = :id"
            );
            $bumpPart = $db->prepare(
                "UPDATE wc_participants
                    SET total_coins_earned = total_coins_earned + :b
                  WHERE client_id = :cid"
            );
            foreach ($hits as $h) {
                $bumpPred->bindValue(':b',  $bonus);
                $bumpPred->bindValue(':id', (int)$h['id'], PDO::PARAM_INT);
                $bumpPred->execute();
                $bumpPart->bindValue(':b',   $bonus);
                $bumpPart->bindValue(':cid', (int)$h['client_id'], PDO::PARAM_INT);
                $bumpPart->execute();
                $awarded[] = array(
                    "prediction_id" => (int)$h['id'],
                    "client_id"     => (int)$h['client_id'],
                    "bonus"         => $bonus,
                );
            }
        }

        // Record the MOTM on the match itself and flip result_source.
        $upd = $db->prepare(
            "UPDATE wc_matches
                SET motm_id       = :motm,
                    result_source = 'complete'
              WHERE id = :id"
        );
        $upd->bindParam(':motm', $motm_id,  PDO::PARAM_INT);
        $upd->bindParam(':id',   $match_id, PDO::PARAM_INT);
        $upd->execute();

        return array(
            "match_id"        => $match_id,
            "motm_id"         => $motm_id,
            "per_user_bonus"  => $bonus,
            "users_topped_up" => count($awarded),
            "awards"          => $awarded,
        );
    }
}
?>
