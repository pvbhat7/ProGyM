<?php
/**
 * Cron / admin tool — backfill ESPN team stats + goal-scorer timeline for
 * settled matches that are still missing it.
 *
 * Trigger options:
 *   - Hostinger cron (Daily, 03:00 IST):
 *       curl -s "https://tavrostechinfo.com/PROGYM/ggs/api/wc_cron/backfillEspnStats.php?key=CHANGE_ME"
 *   - Manually after deployment to backfill matches settled before this feature shipped:
 *       same URL in a browser.
 *
 * What it does:
 *   1) Lists every wc_matches row with status = 'settled' and stats_json IS NULL.
 *   2) For rows that already have an espn_event_id, calls
 *      WcEspnStats::fetchAndStore() directly.
 *   3) For rows missing espn_event_id, walks the ESPN scoreboard for that
 *      match's settled date (and a small window around it), finds the event by
 *      sorted team-code pair, persists espn_event_id, then calls fetchAndStore().
 *
 * Safety:
 *   - Same shared-secret key check as autoSettleFromEspn.php.
 *   - Idempotent — re-running only touches rows that still have stats_json NULL,
 *     except when invoked with ?force=1 which re-fetches every settled match.
 */

header("Content-Type: application/json; charset=UTF-8");

define('CRON_SECRET', 'wcCron_8Hk2Mq4Tn9pXr');

$key = isset($_GET['key']) ? $_GET['key'] : '';
if (!hash_equals(CRON_SECRET, $key)) {
    http_response_code(403);
    echo json_encode(array("message" => "Forbidden."));
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcEspnStats.php';

$force = !empty($_GET['force']);

$ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

function fetchEspnJson($url) {
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

$database = new Database();
$db = $database->getConnection();

// 1) Rows that need work.
$sql = "SELECT m.id, m.settled_at, m.espn_event_id,
               ta.short_code AS code_a, tb.short_code AS code_b,
               ta.name AS name_a, tb.name AS name_b
          FROM wc_matches m
          JOIN wc_teams ta ON ta.id = m.team_a_id
          JOIN wc_teams tb ON tb.id = m.team_b_id
         WHERE m.discontinue = 'false'
           AND m.status      = 'settled'";
if (!$force) $sql .= " AND m.stats_json IS NULL";
$sql .= " ORDER BY m.settled_at DESC LIMIT 50";

$rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

// Cache scoreboard fetches by date so 10 rows on the same day = 1 ESPN hit.
$scoreboardCache = array();

$results = array();
foreach ($rows as $m) {
    $matchId = (int)$m['id'];
    $codeA   = strtoupper($m['code_a']);
    $codeB   = strtoupper($m['code_b']);

    // 2a) Need to discover ESPN event id first?
    if (empty($m['espn_event_id'])) {
        $dateYmd = $m['settled_at'] ? date('Ymd', strtotime($m['settled_at'])) : date('Ymd');
        // Walk +/- 1 day to handle UTC vs IST boundary mismatches.
        $candidateDays = array($dateYmd, date('Ymd', strtotime($m['settled_at'].' -1 day')), date('Ymd', strtotime($m['settled_at'].' +1 day')));

        $foundId = null;
        foreach ($candidateDays as $ymd) {
            if (!isset($scoreboardCache[$ymd])) {
                $scoreboardCache[$ymd] = fetchEspnJson($ESPN_SCOREBOARD . '?dates=' . urlencode($ymd));
            }
            $j = $scoreboardCache[$ymd];
            if (!$j || empty($j['events'])) continue;
            foreach ($j['events'] as $ev) {
                if (empty($ev['competitions'][0]['competitors'])) continue;
                $pairCodes = array();
                foreach ($ev['competitions'][0]['competitors'] as $c) {
                    if (isset($c['team']['abbreviation'])) $pairCodes[] = strtoupper($c['team']['abbreviation']);
                }
                if (count($pairCodes) !== 2) continue;
                sort($pairCodes);
                $sortedOurs = array($codeA, $codeB); sort($sortedOurs);
                if ($pairCodes[0] === $sortedOurs[0] && $pairCodes[1] === $sortedOurs[1]) {
                    $foundId = isset($ev['id']) ? (string)$ev['id'] : null;
                    break 2;
                }
            }
        }

        if ($foundId === null) {
            $results[] = array("match_id" => $matchId, "label" => "{$codeA} vs {$codeB}", "ok" => false, "reason" => "espn_event_not_found");
            continue;
        }

        $upd = $db->prepare("UPDATE wc_matches SET espn_event_id = :eid WHERE id = :id");
        $upd->bindValue(':eid', $foundId);
        $upd->bindValue(':id', $matchId, PDO::PARAM_INT);
        $upd->execute();
    }

    // 2b) Fetch + store via shared helper.
    try {
        $r = WcEspnStats::fetchAndStore($db, $matchId);
        $results[] = array(
            "match_id"    => $matchId,
            "label"       => "{$codeA} vs {$codeB}",
            "ok"          => !empty($r['ok']),
            "reason"      => isset($r['reason']) ? $r['reason'] : '',
            "goals_count" => isset($r['goals_count']) ? $r['goals_count'] : 0,
        );
    } catch (Exception $e) {
        $results[] = array("match_id" => $matchId, "label" => "{$codeA} vs {$codeB}", "ok" => false, "reason" => $e->getMessage());
    }
}

// Audit log (best-effort).
try {
    $okCount   = 0; foreach ($results as $r) if (!empty($r['ok'])) $okCount++;
    $failCount = count($results) - $okCount;
    $log = $db->prepare("INSERT INTO batch_logs (batchName, date, status) VALUES ('wc_backfill_espn_stats', :d, :s)");
    $log->bindValue(':d', date('d/m/Y H:i:s'));
    $log->bindValue(':s', "{$okCount} stored, {$failCount} failed");
    $log->execute();
} catch (Exception $e) { /* ignore */ }

echo json_encode(array(
    "fetched_at" => gmdate('Y-m-d\TH:i:s\Z'),
    "force"      => $force,
    "considered" => count($rows),
    "results"    => $results,
));
?>
