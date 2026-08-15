<?php
    // Returns the per-category football-credit breakdown for a client.
    // Each settled match can produce up to 4 rows — one per active prediction
    // category (Match Winner, Both Teams to Score, Exact Final Score, MOTM).
    // Zero-credit categories are filtered out. Used by the Leaderboard modal
    // so anyone can audit how another player accumulated their score.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcScoringHelper.php';
    include_once '../../class/WcTournamentPrediction.php';

    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if ($client_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing or invalid client_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $sql = "SELECT p.id                AS prediction_id,
                   p.match_id,
                   p.pred_winner,
                   p.pred_both_score,
                   p.pred_motm_id,
                   p.pred_score_a,
                   p.pred_score_b,
                   p.coins_awarded,
                   p.submitted_at,
                   p.settled_at,
                   m.kickoff_at,
                   m.multiplier,
                   m.winner            AS actual_winner,
                   m.score_a           AS actual_score_a,
                   m.score_b           AS actual_score_b,
                   m.motm_id           AS actual_motm_id,
                   m.both_teams_scored,
                   COALESCE(ta.name, m.team_a_label)       AS team_a_name,
                   ta.short_code                            AS team_a_code,
                   COALESCE(tb.name, m.team_b_label)       AS team_b_name,
                   tb.short_code                            AS team_b_code,
                   mp.name             AS pred_motm_name
            FROM wc_predictions p
            JOIN wc_matches m       ON m.id  = p.match_id
            LEFT JOIN wc_teams   ta ON ta.id = m.team_a_id
            LEFT JOIN wc_teams   tb ON tb.id = m.team_b_id
            LEFT JOIN wc_players mp ON mp.id = p.pred_motm_id
            WHERE p.client_id  = :cid
              AND p.is_settled = 'yes'
              AND p.coins_awarded > 0
            ORDER BY p.settled_at DESC, p.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
    $stmt->execute();

    $rows = array();
    $totalCredit = 0.0;
    $catOrder = array(
        'winner'      => array('Match Winner',         WC_COIN_WINNER),
        'both-score'  => array('Both Teams to Score',  WC_COIN_BOTH_SCORE),
        'exact-score' => array('Exact Final Score',    WC_COIN_EXACT_SCORE),
        'motm'        => array('Man of the Match',     WC_COIN_MOTM),
    );

    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        $mult     = (float)$r['multiplier'];
        $aWinner  = $r['actual_winner'] !== null ? strtoupper($r['actual_winner']) : null;
        $aBoth    = $r['both_teams_scored'] !== null ? strtoupper($r['both_teams_scored']) : null;
        $aMotm    = $r['actual_motm_id'] !== null ? (int)$r['actual_motm_id'] : null;
        $aScoreA  = $r['actual_score_a'] !== null ? (int)$r['actual_score_a'] : null;
        $aScoreB  = $r['actual_score_b'] !== null ? (int)$r['actual_score_b'] : null;

        $hits = array();
        if ($r['pred_winner']     !== null && $aWinner !== null && strtoupper($r['pred_winner']) === $aWinner){
            $hits['winner'] = WC_COIN_WINNER * $mult;
        }
        if ($r['pred_both_score'] !== null && $aBoth !== null && strtoupper($r['pred_both_score']) === $aBoth){
            $hits['both-score'] = WC_COIN_BOTH_SCORE * $mult;
        }
        if ($r['pred_score_a'] !== null && $r['pred_score_b'] !== null &&
            $aScoreA !== null && $aScoreB !== null &&
            (int)$r['pred_score_a'] === $aScoreA && (int)$r['pred_score_b'] === $aScoreB){
            $hits['exact-score'] = WC_COIN_EXACT_SCORE * $mult;
        }
        if ($r['pred_motm_id'] !== null && $aMotm !== null && (int)$r['pred_motm_id'] === $aMotm){
            $hits['motm'] = WC_COIN_MOTM * $mult;
        }

        // Emit in fixed category order so a match's rows stay grouped predictably.
        $emittedForMatch = 0.0;
        foreach ($catOrder as $catKey => $meta){
            if (!isset($hits[$catKey])) continue;
            $credit = $hits[$catKey];
            $totalCredit    += $credit;
            $emittedForMatch += $credit;

            $predAnswer = null;
            if ($catKey === 'winner'){
                $pw = strtoupper((string)$r['pred_winner']);
                if      ($pw === 'A')    $predAnswer = $r['team_a_code'];
                else if ($pw === 'B')    $predAnswer = $r['team_b_code'];
                else if ($pw === 'DRAW') $predAnswer = 'Draw';
                else                     $predAnswer = $pw;
            } else if ($catKey === 'both-score'){
                $predAnswer = strtoupper((string)$r['pred_both_score']);
            } else if ($catKey === 'exact-score'){
                $predAnswer = (int)$r['pred_score_a'] . '-' . (int)$r['pred_score_b'];
            } else if ($catKey === 'motm'){
                $predAnswer = $r['pred_motm_name'];
            }

            $rows[] = array(
                "match_id"        => (int)$r['match_id'],
                "kickoff_at"      => $r['kickoff_at'],
                "settled_at"      => $r['settled_at'],
                "submitted_at"    => $r['submitted_at'],
                "team_a_name"     => $r['team_a_name'],
                "team_a_code"     => $r['team_a_code'],
                "team_b_name"     => $r['team_b_name'],
                "team_b_code"     => $r['team_b_code'],
                "actual_score_a"  => $aScoreA,
                "actual_score_b"  => $aScoreB,
                "multiplier"      => $mult,
                "category"        => $catKey,
                "category_label"  => $meta[0],
                "prediction_answer" => $predAnswer,
                "credit"          => $credit,
            );
        }

        // Reconcile with the authoritative stored value. If admin awarded more
        // than the categories can account for (manual make-good, MOTM top-up,
        // exact-score post-fix, etc.), surface the difference as a "Bonus" row
        // so the modal total matches the leaderboard total.
        $storedCoins = (float)$r['coins_awarded'];
        $bonus = $storedCoins - $emittedForMatch;
        if ($bonus > 0.0001) {
            $totalCredit += $bonus;
            $rows[] = array(
                "match_id"        => (int)$r['match_id'],
                "kickoff_at"      => $r['kickoff_at'],
                "settled_at"      => $r['settled_at'],
                "submitted_at"    => $r['submitted_at'],
                "team_a_name"     => $r['team_a_name'],
                "team_a_code"     => $r['team_a_code'],
                "team_b_name"     => $r['team_b_name'],
                "team_b_code"     => $r['team_b_code'],
                "actual_score_a"  => $aScoreA,
                "actual_score_b"  => $aScoreB,
                "multiplier"      => $mult,
                "category"        => 'bonus',
                "category_label"  => 'Bonus',
                "prediction_answer" => '—',
                "credit"          => $bonus,
            );
        }
    }

    // Tournament Awards (Major Awards) — only once settled and only correct picks
    // are surfaced as line items. Values roll up into wc_participants.total_coins_earned
    // so they already count toward the leaderboard total; we just itemize them
    // here so the breakdown modal totals match what the user sees on the board.
    $awardSql = "SELECT p.settled_at, p.submitted_at,
                        p.coins_awarded,
                        p.winner_correct, p.ball_correct,
                        p.boot_correct,   p.glove_correct,
                        wt.short_code AS winner_code,  wt.name AS winner_name,
                        bp.name       AS ball_name,
                        op.name       AS boot_name,
                        gp.name       AS glove_name
                 FROM wc_tournament_predictions p
                 LEFT JOIN wc_teams   wt ON wt.id = p.pred_winner_team_id
                 LEFT JOIN wc_players bp ON bp.id = p.pred_golden_ball_player_id
                 LEFT JOIN wc_players op ON op.id = p.pred_golden_boot_player_id
                 LEFT JOIN wc_players gp ON gp.id = p.pred_golden_glove_player_id
                 WHERE p.client_id = :cid AND p.settled_at IS NOT NULL
                 LIMIT 1";
    $ast = $db->prepare($awardSql);
    $ast->bindParam(':cid', $client_id, PDO::PARAM_INT);
    $ast->execute();
    if ($aw = $ast->fetch(PDO::FETCH_ASSOC)){
        $awardItems = array(
            array('flag'=>$aw['winner_correct'], 'label'=>'World Cup Winner', 'answer'=>$aw['winner_code'] ?: $aw['winner_name'], 'credit'=>WC_AWARD_WINNER_COINS),
            array('flag'=>$aw['ball_correct'],   'label'=>'Golden Ball',      'answer'=>$aw['ball_name'],                         'credit'=>WC_AWARD_GOLDEN_BALL_COINS),
            array('flag'=>$aw['boot_correct'],   'label'=>'Golden Boot',      'answer'=>$aw['boot_name'],                         'credit'=>WC_AWARD_GOLDEN_BOOT_COINS),
            array('flag'=>$aw['glove_correct'],  'label'=>'Golden Glove',     'answer'=>$aw['glove_name'],                        'credit'=>WC_AWARD_GOLDEN_GLOVE_COINS),
        );
        // Prepend award rows so they surface at the top of the modal — they're
        // the rarest / highest-value credits and users need to see them first.
        $awardRows = array();
        foreach ($awardItems as $item){
            if (strtolower((string)$item['flag']) !== 'yes') continue;
            $totalCredit += $item['credit'];
            $awardRows[] = array(
                "match_id"        => 0,
                "kickoff_at"      => null,
                "settled_at"      => $aw['settled_at'],
                "submitted_at"    => $aw['submitted_at'],
                "team_a_name"     => null,
                "team_a_code"     => null,
                "team_b_name"     => null,
                "team_b_code"     => null,
                "actual_score_a"  => null,
                "actual_score_b"  => null,
                "multiplier"      => 1,
                "category"        => 'tournament-award',
                "category_label"  => $item['label'],
                "prediction_answer" => $item['answer'],
                "credit"          => (int)$item['credit'],
            );
        }
        $rows = array_merge($awardRows, $rows);
    }

    echo json_encode(array(
        "client_id"    => $client_id,
        "total_credit" => $totalCredit,
        "rows"         => $rows,
    ));
?>
