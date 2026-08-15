<?php
/**
 * ONE-TIME IMPORT SCRIPT — World Cup 2026 player squads from API-Football.
 *
 * USAGE (run once via browser, then DELETE THIS FILE):
 *   https://tavrostechinfo.com/PROGYM/ggs/api/wc_players/importFromApiFootball.php?key=YOUR_RAPIDAPI_KEY&secret=pg_wc_import_2026
 *
 * Parameters:
 *   key    = your RapidAPI X-RapidAPI-Key (required)
 *   secret = admin secret to prevent random web access (required) - hardcoded as 'pg_wc_import_2026'
 *   dry    = 1 to preview without inserting (optional)
 *
 * What it does:
 *   1. Fetches all 48 World Cup 2026 teams from API-Football (league=1, season=2026)
 *   2. Matches each API team to a row in our wc_teams table by name
 *   3. For each matched team, fetches the squad and inserts into wc_players
 *   4. Skips teams that already have players (idempotent re-run)
 *
 * API quota: 1 + 48 = 49 calls. Free tier = 100/day. Fits comfortably.
 */

header("Content-Type: text/html; charset=UTF-8");

// ---- SECURITY GUARD --------------------------------------------------------
$EXPECTED_SECRET = 'pg_wc_import_2026';
$key             = isset($_GET['key'])    ? trim($_GET['key'])    : '';
$secret          = isset($_GET['secret']) ? trim($_GET['secret']) : '';
$dryRun          = isset($_GET['dry'])    && $_GET['dry'] == '1';

if ($secret !== $EXPECTED_SECRET) {
    http_response_code(403);
    echo "Forbidden. Provide a valid &secret= query parameter.";
    exit;
}
if (empty($key)) {
    http_response_code(400);
    echo "Bad request. Provide your RapidAPI key via &key= query parameter.";
    exit;
}

set_time_limit(300); // 5 min — 49 HTTP calls + inserts may take a while

include_once '../../config/database.php';
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo "DB connection failed.";
    exit;
}

// ---- HELPERS ---------------------------------------------------------------

function apiCall($path, $key) {
    $url = 'https://api-football-v1.p.rapidapi.com/v3/' . ltrim($path, '/');
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'X-RapidAPI-Key: ' . $key,
            'X-RapidAPI-Host: api-football-v1.p.rapidapi.com'
        ]
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($resp === false) return ['error' => $err, 'http' => $code];
    $json = json_decode($resp, true);
    if (!is_array($json)) return ['error' => 'invalid JSON', 'http' => $code, 'raw' => substr($resp, 0, 200)];
    if (!empty($json['errors'])) return ['error' => json_encode($json['errors']), 'http' => $code];
    return $json;
}

// Normalize a country name for fuzzy matching
function normName($s) {
    $s = mb_strtolower($s, 'UTF-8');
    // strip diacritics
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    // drop non-alphanumeric
    $s = preg_replace('/[^a-z0-9]/', '', $s);
    return $s;
}

// Manual aliases for known name mismatches between our DB and API-Football
$NAME_ALIASES = [
    'southkorea'            => ['korearepublic', 'koreasouth', 'korea'],
    'czechia'               => ['czechrepublic'],
    'usa'                   => ['unitedstates', 'usausa'],
    'turkiye'               => ['turkey'],
    'ivorycoast'            => ['cotedivoire', 'cotedivoir'],
    'iran'                  => ['iranislamicrepublic', 'iranislamicrep'],
    'caboverde'             => ['capeverde'],
    'bosniaandherzegovina'  => ['bosniaherzegovina'],
    'drcongo'               => ['congodr', 'democraticrepublicofcongo'],
];

function matchTeam($apiName, $ourTeams, $aliases) {
    $apiNorm = normName($apiName);
    foreach ($ourTeams as $ourRow) {
        $ourNorm = normName($ourRow['name']);
        if ($ourNorm === $apiNorm) return $ourRow;
        // alias check both directions
        if (isset($aliases[$ourNorm]) && in_array($apiNorm, $aliases[$ourNorm], true)) return $ourRow;
        // substring fallback
        if (strlen($ourNorm) > 4 && strlen($apiNorm) > 4) {
            if (strpos($ourNorm, $apiNorm) !== false || strpos($apiNorm, $ourNorm) !== false) {
                return $ourRow;
            }
        }
    }
    return null;
}

function mapPosition($apiPos) {
    $p = strtolower($apiPos ?: '');
    if (strpos($p, 'goal') !== false)       return 'GK';
    if (strpos($p, 'defender') !== false)   return 'DEF';
    if (strpos($p, 'midfielder') !== false) return 'MID';
    if (strpos($p, 'attacker') !== false)   return 'FWD';
    if (strpos($p, 'forward') !== false)    return 'FWD';
    return null;
}

// ---- LOAD OUR TEAMS --------------------------------------------------------
echo "<pre>";
echo "=== ProGym World Cup Player Importer ===\n";
echo "Mode: " . ($dryRun ? "DRY RUN (no inserts)" : "LIVE (will insert)") . "\n\n";

$stmt = $db->prepare("SELECT id, name, short_code, group_name FROM wc_teams ORDER BY id");
$stmt->execute();
$ourTeams = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Loaded " . count($ourTeams) . " teams from wc_teams.\n";

if (count($ourTeams) === 0) {
    echo "ERROR: wc_teams is empty. Run wc_seed_teams.sql first.\n";
    exit;
}

// ---- FETCH API TEAMS (1 call) ---------------------------------------------
echo "\nFetching World Cup 2026 teams from API-Football...\n";
$apiTeamsResp = apiCall('teams?league=1&season=2026', $key);
if (isset($apiTeamsResp['error'])) {
    echo "API ERROR: " . $apiTeamsResp['error'] . "\n";
    echo "Try checking your key and quota at https://rapidapi.com/api-sports/api/api-football\n";
    exit;
}
$apiTeams = $apiTeamsResp['response'] ?? [];
echo "API returned " . count($apiTeams) . " teams.\n\n";

if (count($apiTeams) === 0) {
    echo "WARNING: API returned 0 teams for league=1 season=2026.\n";
    echo "Possible reasons: free tier doesn't cover this league/season,\n";
    echo "or season hasn't been added by API-Football yet.\n";
    echo "Try changing season parameter (e.g. 2025, 2022) for testing.\n";
    exit;
}

// ---- MATCH + IMPORT --------------------------------------------------------
$insertStmt = $db->prepare("
    INSERT INTO wc_players (team_id, name, position, jersey_number, discontinue)
    VALUES (:team_id, :name, :position, :jersey_number, 'false')
");

$existsStmt = $db->prepare("SELECT COUNT(*) FROM wc_players WHERE team_id = :tid");

$matched      = 0;
$unmatched    = [];
$skipped      = [];
$totalInserts = 0;

foreach ($apiTeams as $apiRow) {
    $apiName    = $apiRow['team']['name']    ?? '';
    $apiTeamId  = $apiRow['team']['id']      ?? 0;
    if (empty($apiName) || empty($apiTeamId)) continue;

    $match = matchTeam($apiName, $ourTeams, $NAME_ALIASES);
    if (!$match) {
        $unmatched[] = $apiName;
        continue;
    }
    $matched++;
    $ourTeamId = (int)$match['id'];

    // skip if already has players
    $existsStmt->execute([':tid' => $ourTeamId]);
    $existing = (int)$existsStmt->fetchColumn();
    if ($existing > 0) {
        $skipped[] = $match['name'] . " ({$existing} players already)";
        continue;
    }

    echo "Fetching squad for {$match['name']} (apiId={$apiTeamId})... ";
    $squadResp = apiCall('players/squads?team=' . $apiTeamId, $key);
    if (isset($squadResp['error'])) {
        echo "API ERROR: " . $squadResp['error'] . "\n";
        continue;
    }
    $squadData = $squadResp['response'][0]['players'] ?? [];
    echo count($squadData) . " players. ";

    $inserted = 0;
    foreach ($squadData as $p) {
        $name   = trim($p['name'] ?? '');
        if (empty($name)) continue;
        $pos    = mapPosition($p['position'] ?? '');
        $jersey = isset($p['number']) ? (int)$p['number'] : null;

        if (!$dryRun) {
            $insertStmt->execute([
                ':team_id'       => $ourTeamId,
                ':name'          => $name,
                ':position'      => $pos,
                ':jersey_number' => $jersey,
            ]);
        }
        $inserted++;
    }
    $totalInserts += $inserted;
    echo "Inserted: {$inserted}\n";
}

// ---- REPORT ----------------------------------------------------------------
echo "\n========== SUMMARY ==========\n";
echo "Teams matched:         {$matched}\n";
echo "Teams skipped (had players): " . count($skipped) . "\n";
if (!empty($skipped)) {
    foreach ($skipped as $s) echo "  - {$s}\n";
}
echo "Teams unmatched (API → ours): " . count($unmatched) . "\n";
if (!empty($unmatched)) {
    foreach ($unmatched as $u) echo "  - {$u}\n";
}
echo "Total players inserted: {$totalInserts}\n";
echo ($dryRun ? "(DRY RUN — nothing was actually written.)\n" : "Done.\n");
echo "\nIMPORTANT: After successful import, DELETE this file from the server.\n";
echo "</pre>";
