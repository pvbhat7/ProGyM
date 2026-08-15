<?php
// Pulls the FIFA WC 2026 knockout-stage schedule from Wikipedia and upserts
// fixtures into wc_matches. Match IDs use FIFA bracket positions (73-104).
//
// Safety rules (never corrupt existing data):
//   1. Status = 'settled' rows are NEVER touched.
//   2. A real team_a_id / team_b_id is NEVER overwritten with NULL.
//      (Source can only ADD info, not remove it.)
//   3. kickoff_at is updated freely — Wikipedia is authoritative for schedule.
//   4. stage / multiplier are set from bracket position.
//
// Usage:
//   GET .../api/wc_matches/syncMatches.php          → applies changes, returns JSON
//   GET .../api/wc_matches/syncMatches.php?dry=1    → preview only, no writes
//
// Public endpoint. No auth required (per user direction).

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';

$dry = isset($_GET['dry']) && $_GET['dry'] === '1';

function fail($msg, $extra = []) {
    http_response_code(500);
    echo json_encode(array_merge(['ok' => false, 'error' => $msg], $extra));
    exit;
}

// 1. Fetch Wikipedia knockout-stage page
$wikiUrl = 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage';
$html = false;
if (function_exists('curl_init')) {
    $ch = curl_init($wikiUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_ENCODING       => '',                // accept gzip/deflate, auto-decompress
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; progym-wc-sync/1.0; +https://tavrostechinfo.com)',
        CURLOPT_HTTPHEADER     => ['Accept: text/html,*/*;q=0.8', 'Accept-Language: en-US,en;q=0.9'],
    ]);
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);
    if ($html === false || $httpCode !== 200) {
        fail('cURL fetch failed', ['http_code' => $httpCode, 'curl_error' => $curlErr, 'source_url' => $wikiUrl]);
    }
} else {
    $ctx = stream_context_create(['http' => [
        'timeout'    => 20,
        'user_agent' => 'Mozilla/5.0 (compatible; progym-wc-sync/1.0)',
        'header'     => "Accept-Encoding: identity\r\n",
    ]]);
    $html = @file_get_contents($wikiUrl, false, $ctx);
}
if ($html === false || strlen($html) < 5000) {
    fail('Could not fetch Wikipedia page', ['source_url' => $wikiUrl, 'html_len' => is_string($html) ? strlen($html) : 'false']);
}

// 2. Strip HTML → plain text (preserves spaces but collapses tags)
$txt = preg_replace('/<style[\s\S]*?<\/style>/', '', $html);
$txt = preg_replace('/<script[\s\S]*?<\/script>/', '', $txt);
$txt = preg_replace('/<br\s*\/?>/i', "\n", $txt);
$txt = preg_replace('/<\/p>/i', "\n", $txt);
$txt = preg_replace('/<\/div>/i', "\n", $txt);
$txt = preg_replace('/<[^>]+>/', ' ', $txt);
$txt = str_replace('&nbsp;', ' ', $txt);
$txt = preg_replace('/&#?\w+;/', ' ', $txt);
// Wikipedia's date/time markup embeds real UTF-8 NBSPs (0xC2 0xA0) and thin/narrow
// no-break spaces between "June", "28,", "2026", "12:00", "p.m." etc. PHP's PCRE \s
// (without the /u flag) only matches ASCII whitespace, so leaving these bytes in
// makes the fixture regex fail with 0 matches even though the layout is unchanged.
$txt = str_replace(["\xC2\xA0", "\xE2\x80\x89", "\xE2\x80\xAF", "\xE2\x80\x8B"], ' ', $txt);
$txt = preg_replace('/[ \t]+/', ' ', $txt);

// 3. Parse match blocks. Each block: date + time + UTC offset + team-block + Report N.
// Normalize all minus-like chars to ASCII '-' so the regex stays simple.
$txt = str_replace(["\xE2\x88\x92", "\xE2\x80\x93", "\xE2\x80\x94"], '-', $txt); // U+2212, U+2013 (en dash), U+2014 (em dash)

$pattern = '/(June|July)\s+(\d{1,2}),\s+2026\s*\(\s*(2026-\d{2}-\d{2})\s*\)\s*(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)\s*UTC\s*([+-])(\d+)\s*([\s\S]*?)\s*Report\s*\d{1,3}/';
preg_match_all($pattern, $txt, $matches, PREG_SET_ORDER);
// Mid-tournament, Wikipedia rewrites played rows to include the score instead
// of the "Match N" label. Those blocks still match the outer regex but fall
// through the label parser below. Only fail if we recovered nothing at all —
// that signals a real layout break (see NBSP fix above for the last one).
preg_match_all('/(June|July)\s+\d{1,2},\s+2026\s*\(\s*2026-\d{2}-\d{2}\s*\)/', $txt, $dateMatches);
$dateStampCount = count($dateMatches[0] ?? []);
if (count($matches) === 0) {
    fail('Parsed 0 fixture blocks — Wikipedia layout may have changed', [
        'expected'        => 32,
        'date_stamps'     => $dateStampCount,
        'txt_len'         => strlen($txt),
        'sample'          => substr($txt, 0, 400),
    ]);
}

$items = [];  // bracket_num → row
foreach ($matches as $m) {
    $block = trim(preg_replace('/\s+/', ' ', $m[9]));
    // Wikipedia's fixture rows end with a "[Report N]" citation link. Once
    // matches are played, additional "[N]" inline citation refs and goal-scorer
    // notes get injected too. Strip trailing "[..." opener + any inline "[ N ]"
    // refs so the label parsers see clean team labels for unplayed fixtures
    // (played fixtures fall through unmatched, which is the right behaviour —
    // their DB row is either already settled or has real team IDs we mustn't
    // overwrite with a placeholder label).
    $block = preg_replace('/\s*\[[^\]]*$/', '', $block);
    $block = preg_replace('/\s*\[\s*\d+\s*\]/', '', $block);
    $block = trim($block);
    // R16+: "Winner|Loser Match X Match Y Winner|Loser Match Z"
    $parsed = null;
    if (preg_match('/^((?:Winner|Loser)\s+Match\s+\d+)\s+Match\s+(\d{2,3})\s+((?:Winner|Loser)\s+Match\s+\d+)$/', $block, $mm)) {
        $parsed = ['num' => (int)$mm[2], 'a' => $mm[1], 'b' => $mm[3]];
    } else if (preg_match('/^(.+?)\s+Match\s+(\d{2,3})\s+(.+)$/', $block, $mm)) {
        $parsed = ['num' => (int)$mm[2], 'a' => trim($mm[1]), 'b' => trim($mm[3])];
    }
    if (!$parsed) continue;
    if (isset($items[$parsed['num']])) continue;  // first wins

    $iso = $m[3]; $hr = (int)$m[4]; $mn = (int)$m[5]; $ampm = $m[6]; $off = (int)$m[8];
    if (strpos($ampm, 'p') === 0 && $hr !== 12) $hr += 12;
    if (strpos($ampm, 'a') === 0 && $hr === 12) $hr = 0;
    $utc = strtotime("$iso $hr:$mn:00 UTC") + $off * 3600;  // local was UTC-X → UTC = local + X
    $ist = $utc + 5.5 * 3600;
    $istStr = gmdate('Y-m-d H:i:s', (int)$ist);

    $items[$parsed['num']] = [
        'id' => $parsed['num'],
        'a_label' => $parsed['a'],
        'b_label' => $parsed['b'],
        'kickoff' => $istStr,
    ];
}

if (count($items) === 0) fail('No fixtures parsed from Wikipedia');

// 4. Resolve team labels → wc_teams.id
$database = new Database();
$db = $database->getConnection();
if (!$db) fail('Database connection failed');

$tStmt = $db->query("SELECT id, name FROM wc_teams WHERE discontinue != 'true'");
$byName = [];
foreach ($tStmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
    $byName[strtolower($t['name'])] = (int)$t['id'];
}
$aliases = ['united states' => 'usa', 'cape verde' => 'cabo verde'];

function resolveId($label, $byName, $aliases) {
    $k = strtolower(trim($label));
    if (isset($aliases[$k])) $k = $aliases[$k];
    return $byName[$k] ?? null;
}

function stageFor($n) {
    // Multiplier is intentionally 1.0 for every knockout stage. Coin cap is
    // flat 20 pts/match — matches WcScoringHelper::settleMatchPredictions()
    // which hardcodes multiplier=1.0 and awards base coins only.
    if ($n >= 73 && $n <= 88) return ['r32', 1.0];
    if ($n >= 89 && $n <= 96) return ['r16', 1.0];
    if ($n >= 97 && $n <= 100) return ['qf',  1.0];
    if ($n >= 101 && $n <= 102) return ['sf', 1.0];
    if ($n === 103) return ['3rd', 1.0];
    if ($n === 104) return ['final', 1.0];
    return [null, 1.0];
}

// 5. Load existing rows for safety checks
$idList = implode(',', array_map('intval', array_keys($items)));
$existing = [];
if ($idList !== '') {
    $eStmt = $db->query("SELECT id, team_a_id, team_b_id, team_a_label, team_b_label, status, kickoff_at FROM wc_matches WHERE id IN ($idList)");
    foreach ($eStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $existing[(int)$r['id']] = $r;
    }
}

// 6. Build plan
$plan = ['inserted' => [], 'updated' => [], 'skipped_settled' => [], 'unchanged' => []];

foreach ($items as $it) {
    $id = $it['id'];
    list($stage, $mult) = stageFor($id);
    if (!$stage) continue;
    $aid = resolveId($it['a_label'], $byName, $aliases);
    $bid = resolveId($it['b_label'], $byName, $aliases);
    $aLabel = $aid ? null : $it['a_label'];
    $bLabel = $bid ? null : $it['b_label'];

    if (!isset($existing[$id])) {
        $plan['inserted'][] = [
            'id' => $id, 'stage' => $stage, 'kickoff' => $it['kickoff'],
            'team_a_id' => $aid, 'team_b_id' => $bid,
            'team_a_label' => $aLabel, 'team_b_label' => $bLabel,
        ];
        continue;
    }
    $ex = $existing[$id];
    if ($ex['status'] === 'settled') {
        $plan['skipped_settled'][] = $id;
        continue;
    }
    // Safety: NEVER downgrade real team_id to NULL
    $aIdFinal = ($ex['team_a_id'] && !$aid) ? (int)$ex['team_a_id'] : $aid;
    $bIdFinal = ($ex['team_b_id'] && !$bid) ? (int)$ex['team_b_id'] : $bid;
    $aLabelFinal = $aIdFinal ? null : $aLabel;
    $bLabelFinal = $bIdFinal ? null : $bLabel;

    // Determine what changed
    $changes = [];
    if ((int)$ex['team_a_id'] !== (int)$aIdFinal) $changes['team_a_id'] = ['from' => $ex['team_a_id'], 'to' => $aIdFinal];
    if ((int)$ex['team_b_id'] !== (int)$bIdFinal) $changes['team_b_id'] = ['from' => $ex['team_b_id'], 'to' => $bIdFinal];
    if (($ex['team_a_label'] ?? '') !== ($aLabelFinal ?? '')) $changes['team_a_label'] = ['from' => $ex['team_a_label'], 'to' => $aLabelFinal];
    if (($ex['team_b_label'] ?? '') !== ($bLabelFinal ?? '')) $changes['team_b_label'] = ['from' => $ex['team_b_label'], 'to' => $bLabelFinal];
    if ($ex['kickoff_at'] !== $it['kickoff']) $changes['kickoff_at'] = ['from' => $ex['kickoff_at'], 'to' => $it['kickoff']];

    if (count($changes) === 0) {
        $plan['unchanged'][] = $id;
        continue;
    }
    $plan['updated'][] = [
        'id' => $id, 'stage' => $stage,
        'team_a_id' => $aIdFinal, 'team_b_id' => $bIdFinal,
        'team_a_label' => $aLabelFinal, 'team_b_label' => $bLabelFinal,
        'kickoff' => $it['kickoff'],
        'changes' => $changes,
    ];
}

// 7. Apply (unless dry)
if (!$dry) {
    $db->beginTransaction();
    try {
        $insSql = "INSERT INTO wc_matches (id, team_a_id, team_b_id, team_a_label, team_b_label, stage, multiplier, kickoff_at, status, discontinue, result_source)
                   VALUES (:id, :aid, :bid, :alab, :blab, :stage, :mult, :kickoff, 'upcoming', 'false', 'pending')";
        $insStmt = $db->prepare($insSql);
        foreach ($plan['inserted'] as $row) {
            list($stage, $mult) = stageFor($row['id']);
            $insStmt->bindValue(':id',      $row['id'],           PDO::PARAM_INT);
            $insStmt->bindValue(':aid',     $row['team_a_id'],    $row['team_a_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $insStmt->bindValue(':bid',     $row['team_b_id'],    $row['team_b_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $insStmt->bindValue(':alab',    $row['team_a_label'], $row['team_a_label'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $insStmt->bindValue(':blab',    $row['team_b_label'], $row['team_b_label'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $insStmt->bindValue(':stage',   $stage,               PDO::PARAM_STR);
            $insStmt->bindValue(':mult',    $mult);
            $insStmt->bindValue(':kickoff', $row['kickoff'],      PDO::PARAM_STR);
            $insStmt->execute();
        }

        $updSql = "UPDATE wc_matches SET team_a_id=:aid, team_b_id=:bid, team_a_label=:alab, team_b_label=:blab,
                                          stage=:stage, multiplier=:mult, kickoff_at=:kickoff
                   WHERE id=:id AND status <> 'settled'";
        $updStmt = $db->prepare($updSql);
        foreach ($plan['updated'] as $row) {
            list($stage, $mult) = stageFor($row['id']);
            $updStmt->bindValue(':id',      $row['id'],           PDO::PARAM_INT);
            $updStmt->bindValue(':aid',     $row['team_a_id'],    $row['team_a_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $updStmt->bindValue(':bid',     $row['team_b_id'],    $row['team_b_id'] === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
            $updStmt->bindValue(':alab',    $row['team_a_label'], $row['team_a_label'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $updStmt->bindValue(':blab',    $row['team_b_label'], $row['team_b_label'] === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $updStmt->bindValue(':stage',   $stage,               PDO::PARAM_STR);
            $updStmt->bindValue(':mult',    $mult);
            $updStmt->bindValue(':kickoff', $row['kickoff'],      PDO::PARAM_STR);
            $updStmt->execute();
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        fail('Apply failed: ' . $e->getMessage());
    }
}

// 8. Response
echo json_encode([
    'ok' => true,
    'dry_run' => $dry,
    'source' => $wikiUrl,
    'fetched_at_ist' => gmdate('Y-m-d H:i:s', time() + 5.5 * 3600),
    'parsed_total' => count($items),
    'summary' => [
        'inserted'        => count($plan['inserted']),
        'updated'         => count($plan['updated']),
        'unchanged'       => count($plan['unchanged']),
        'skipped_settled' => count($plan['skipped_settled']),
    ],
    'detail' => $plan,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
