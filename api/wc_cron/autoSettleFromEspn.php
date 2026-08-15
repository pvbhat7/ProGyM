<?php
/**
 * Cron — auto-settle every wc_match whose ESPN counterpart is Full Time.
 *
 * Trigger:
 *   Hostinger cron (cPanel → Cron Jobs), every 5 minutes:
 *     curl -s "https://tavrostechinfo.com/PROGYM/ggs/api/wc_cron/autoSettleFromEspn.php?key=CHANGE_ME"
 *
 * What it does:
 *   1) Fetches the ESPN WC scoreboard (same endpoint as wc_live/getLive.php).
 *      Reuses the same 30s cache file to avoid hammering ESPN.
 *   2) For every wc_matches row with status='upcoming' whose ESPN twin shows
 *      state='post' (Full Time), runs WcScoringHelper::settleMatchPredictions
 *      with motm_id = NULL and first_scorer_id = NULL.
 *   3) Sets wc_matches.result_source = 'espn_partial' so the admin UI knows
 *      the MOTM bonus is still owed.
 *   4) Writes a row to batch_logs so we can audit runs.
 *
 * Footballs for winner/score/both-score/total-goals/exact-score are awarded
 * immediately. MOTM bonus is paid out later by admin via topUpMotm.php.
 *
 * Safety:
 *   - Shared-secret key in query string (matches CRON_SECRET below). Reject
 *     unauthenticated callers with 403.
 *   - Each match settled in its own transaction. One match failing does not
 *     abort the rest.
 *   - status='upcoming' + the inner Match-already-settled guard make the run
 *     fully idempotent — re-running has no effect on already-settled matches.
 */

header("Content-Type: application/json; charset=UTF-8");

// ⚠️ Shared secret with the Hostinger cron command's ?key= value.
// If you ever change this, also update the cron URL in cPanel.
define('CRON_SECRET', 'wcCron_8Hk2Mq4Tn9pXr');

$key = isset($_GET['key']) ? $_GET['key'] : '';
if (!hash_equals(CRON_SECRET, $key)) {
    http_response_code(403);
    echo json_encode(array("message" => "Forbidden."));
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcScoringHelper.php';
include_once '../../class/WcFcmSender.php';
include_once '../../class/WcParticipant.php';
include_once '../../class/WcEspnStats.php';
include_once '../../class/WcSpecialPrediction.php';

$ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
// ESPN's default scoreboard only returns *today's* events in their day-boundary
// (US Eastern). To catch matches that finished overnight — or that fall on a
// previous day relative to the cron server's clock — we also pull the last N
// days and merge the events by id.
$DAYS_BACK = 2;

function fetchEspn($url) {
    $ctx = stream_context_create(array(
        "http" => array(
            "timeout" => 10,
            "header"  => "Accept: application/json\r\nUser-Agent: progym-wc2026/1.0\r\n",
        )
    ));
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) return null;
    $j = json_decode($raw, true);
    return is_array($j) ? $j : null;
}

// ---------------------------------------------------------------
// 1) Pull today + previous N days from ESPN; dedupe by event id.
// ---------------------------------------------------------------
$mergedEvents = array();
$seenIds      = array();
$daysFetched  = array();

for ($i = 0; $i <= $DAYS_BACK; $i++) {
    $url = $i === 0
        ? $ESPN_BASE
        : $ESPN_BASE . '?dates=' . date('Ymd', strtotime("-{$i} day"));
    $j = fetchEspn($url);
    if (!$j || empty($j['events'])) { continue; }
    $daysFetched[] = $i === 0 ? 'today' : "-{$i}d";
    foreach ($j['events'] as $ev) {
        $id = isset($ev['id']) ? (string)$ev['id'] : null;
        if ($id === null || isset($seenIds[$id])) continue;
        $seenIds[$id]   = true;
        $mergedEvents[] = $ev;
    }
}

if (empty($mergedEvents)) {
    http_response_code(502);
    echo json_encode(array("message" => "ESPN returned no events for any of the fetched days."));
    exit;
}

$espn = array('events' => $mergedEvents);

// ---------------------------------------------------------------
// 2) DB: load upcoming matches keyed by sorted team pair
// ---------------------------------------------------------------
$database = new Database();
$db = $database->getConnection();

$upcomingByPair = array(); // 'AAA|BBB' -> array(id, multiplier, label)
$stmt = $db->query(
    "SELECT m.id, m.multiplier,
            ta.short_code AS code_a, tb.short_code AS code_b,
            ta.name AS name_a,        tb.name AS name_b
       FROM wc_matches m
       JOIN wc_teams ta ON ta.id = m.team_a_id
       JOIN wc_teams tb ON tb.id = m.team_b_id
      WHERE m.discontinue = 'false' AND m.status = 'upcoming'"
);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $pair = array(strtoupper($row['code_a']), strtoupper($row['code_b']));
    sort($pair);
    $upcomingByPair[$pair[0] . '|' . $pair[1]] = array(
        'id'    => (int)$row['id'],
        'label' => $row['name_a'] . ' vs ' . $row['name_b'],
    );
}

// ---------------------------------------------------------------
// 3) Walk ESPN events; settle each one that's both 'post' and ours.
// ---------------------------------------------------------------
function pickSide($competitors, $side) {
    foreach ($competitors as $c) {
        if (isset($c['homeAway']) && $c['homeAway'] === $side) return $c;
    }
    return null;
}

$settled       = array();
$failed        = array();
$skipped       = 0;
$settledDates  = array();   // unique YYYY-MM-DD dates touched this run, for snapshot pass

foreach ($espn['events'] as $ev) {
    if (empty($ev['competitions'][0])) continue;
    $comp = $ev['competitions'][0];
    $st   = isset($comp['status']['type']['state']) ? $comp['status']['type']['state'] : 'pre';
    if ($st !== 'post') { continue; }   // only Full-Time events qualify

    $home = pickSide($comp['competitors'], 'home');
    $away = pickSide($comp['competitors'], 'away');
    if (!$home || !$away) continue;
    $codeH = strtoupper($home['team']['abbreviation']);
    $codeA = strtoupper($away['team']['abbreviation']);
    $pair  = array($codeH, $codeA); sort($pair);
    $key   = $pair[0] . '|' . $pair[1];

    if (!isset($upcomingByPair[$key])) {
        // Either not our fixture, or already settled — both fine.
        $skipped++;
        continue;
    }

    $matchId = $upcomingByPair[$key]['id'];
    $espnEventId = isset($ev['id']) ? (string)$ev['id'] : null;
    $scoreH  = (int)$home['score'];
    $scoreA  = (int)$away['score'];

    // ESPN's home corresponds to ESPN's home team. Map to our team_a / team_b.
    // We need to know whether ESPN's "home" is our team A or team B so the
    // score_a/score_b columns are oriented correctly.
    $detail = $db->prepare(
        "SELECT m.id, ta.short_code AS code_a, tb.short_code AS code_b
           FROM wc_matches m
           JOIN wc_teams ta ON ta.id = m.team_a_id
           JOIN wc_teams tb ON tb.id = m.team_b_id
          WHERE m.id = :id"
    );
    $detail->bindValue(':id', $matchId, PDO::PARAM_INT);
    $detail->execute();
    $mRow = $detail->fetch(PDO::FETCH_ASSOC);
    if (!$mRow) { $skipped++; continue; }

    $espnHomeIsOurA = (strtoupper($mRow['code_a']) === $codeH);
    $score_a = $espnHomeIsOurA ? $scoreH : $scoreA;
    $score_b = $espnHomeIsOurA ? $scoreA : $scoreH;
    $winner  = ($score_a > $score_b) ? 'A' : ($score_a < $score_b ? 'B' : 'DRAW');

    try {
        $db->beginTransaction();
        $r = WcScoringHelper::settleMatchPredictions(
            $db, $matchId, $winner, $score_a, $score_b, null, null
        );
        // Mark this match as partially-settled by ESPN (MOTM bonus still owed).
        // Also persist the ESPN event id so the stats fetcher (next step) and the
        // backfill cron know which event to query on the summary endpoint.
        $upd = $db->prepare("UPDATE wc_matches SET result_source = 'espn_partial', espn_event_id = :eid WHERE id = :id");
        $upd->bindValue(':eid', $espnEventId);
        $upd->bindParam(':id', $matchId, PDO::PARAM_INT);
        $upd->execute();
        $db->commit();

        // Fetch + store team stats and goal-scorer timeline from ESPN's
        // per-match summary endpoint. Done OUTSIDE the settlement transaction so
        // a stats fetch failure can never roll back the football awards.
        try {
            if ($espnEventId !== null) {
                WcEspnStats::fetchAndStore($db, $matchId);
            }
        } catch (Exception $eStats) { /* never let stats fetch abort the cron */ }

        // Knockout Bonanza side-grade: if this is one of M101-M104, grade the
        // wc_special_predictions rows now. Same pattern as wc_matches/settle.php
        // (post-commit, its own try) so a bonanza failure can't roll back coins.
        try {
            if (in_array((int)$matchId, [101, 102, 103, 104], true)) {
                $special = new WcSpecialPrediction($db);
                $special->settleAllForMatch((int)$matchId);
            }
        } catch (Exception $eSp) { /* never let special-settle abort the cron */ }

        // Capture the match's settled date for end-of-loop snapshot pass.
        try {
            $ds = $db->prepare("SELECT DATE(settled_at) AS d FROM wc_matches WHERE id = :id");
            $ds->bindParam(':id', $matchId, PDO::PARAM_INT);
            $ds->execute();
            $dRow = $ds->fetch(PDO::FETCH_ASSOC);
            if ($dRow && !empty($dRow['d'])) $settledDates[$dRow['d']] = true;
        } catch (Exception $eDate) { /* ignore */ }

        $settled[] = array(
            "match_id"            => $matchId,
            "label"               => $r['match_label'],
            "score"               => "{$score_a}-{$score_b}",
            "winner"              => $winner,
            "predictions_settled" => $r['predictions_settled'],
            "users_awarded"       => $r['users_awarded'],
            "coins_distributed"   => $r['coins_distributed'],
        );

        // ----- Push: predictor + broadcast notifications -----
        // OUTSIDE the DB transaction so push failure can't roll back settlement.
        try {
            WcFcmSender::notifyMatchSettled(
                $db, $matchId,
                $r['team_a_name'], $r['team_b_name'],
                $winner, $score_a, $score_b,
                $r['per_user']
            );
        } catch (Exception $eNotif) { /* never let push failure abort the cron */ }
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        $failed[] = array("match_id" => $matchId, "error" => $e->getMessage());
    }
}

// ---------------------------------------------------------------
// 3.5) Snapshot end-of-day leaderboard for every date touched this run.
// ---------------------------------------------------------------
try {
    if (!empty($settledDates)) {
        $participant = new WcParticipant($db);
        foreach (array_keys($settledDates) as $dYmd) {
            try { $participant->snapshotDailyLeaderboard($dYmd); }
            catch (Exception $eSnap) { /* per-date failure is recoverable via backfill */ }
        }
    }
} catch (Exception $eSnapAll) { /* never let snapshot pass abort the cron */ }

// ---------------------------------------------------------------
// 4) Audit log (best-effort)
// ---------------------------------------------------------------
try {
    $log = $db->prepare("INSERT INTO batch_logs (batchName, date, status) VALUES ('wc_auto_settle', :d, :s)");
    $log->bindValue(':d', date('d/m/Y H:i:s'));
    $log->bindValue(':s', count($settled) . ' settled, ' . count($failed) . ' failed');
    $log->execute();
} catch (Exception $e) { /* ignore */ }

echo json_encode(array(
    "fetched_at"   => gmdate('Y-m-d\TH:i:s\Z'),
    "days_fetched" => $daysFetched,
    "events_seen"  => count($mergedEvents),
    "settled"      => count($settled),
    "failed"       => count($failed),
    "skipped"      => $skipped,
    "details"      => $settled,
    "errors"       => $failed,
));
?>
