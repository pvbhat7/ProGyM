<?php
/**
 * Live scoreboard proxy — calls ESPN's public WC 2026 scoreboard endpoint,
 * caches the trimmed response for 30 seconds, and joins each event to our
 * own wc_matches row by team-pair so the frontend can deep-link to the
 * matching prediction page.
 *
 * GET /api/wc_live/getLive.php
 * Response:
 *   {
 *     "fetched_at":  "2026-06-12T19:31:05Z",
 *     "cache_age_s": 7,
 *     "live":               [ Event, ... ],
 *     "recently_completed": [ Event, ... ],   // today only
 *     "upcoming_today":     [ Event, ... ]
 *   }
 *
 * Event shape:
 *   {
 *     "espn_id":      "760416",
 *     "match_id":     17,         // our wc_matches.id, or null if not found
 *     "state":        "in" | "pre" | "post",
 *     "description":  "1st Half",
 *     "display_clock":"63'",
 *     "kickoff_at":   "2026-06-12T19:00Z",
 *     "venue":        "BMO Field",
 *     "home_code":    "CAN", "home_name": "Canada", "home_score": "0", "home_logo": "https://...",
 *     "away_code":    "BIH", "away_name": "Bosnia-Herzegovina", "away_score": "0", "away_logo": "https://..."
 *   }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Cache-Control: public, max-age=15");

include_once '../../config/database.php';

$ESPN_URL  = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
$CACHE_TTL = 30; // seconds
$CACHE_FILE = sys_get_temp_dir() . '/wc_live_espn.json';

// ---------------------------------------------------------------
// 1) Cached fetch from ESPN
// ---------------------------------------------------------------
$cacheAge  = null;
$rawEspn   = null;

if (is_readable($CACHE_FILE)) {
    $mtime = filemtime($CACHE_FILE);
    if ($mtime !== false && (time() - $mtime) < $CACHE_TTL) {
        $rawEspn  = @file_get_contents($CACHE_FILE);
        $cacheAge = time() - $mtime;
    }
}

if ($rawEspn === null || $rawEspn === false) {
    $ctx = stream_context_create(array(
        "http" => array(
            "timeout" => 8,
            "header"  => "Accept: application/json\r\nUser-Agent: progym-wc2026/1.0\r\n",
        )
    ));
    $rawEspn = @file_get_contents($ESPN_URL, false, $ctx);
    if ($rawEspn === false) {
        http_response_code(502);
        echo json_encode(array("message" => "Upstream ESPN fetch failed."));
        exit;
    }
    @file_put_contents($CACHE_FILE, $rawEspn);
    $cacheAge = 0;
}

$data = json_decode($rawEspn, true);
if (!is_array($data) || !isset($data['events'])) {
    http_response_code(502);
    echo json_encode(array("message" => "Bad upstream payload."));
    exit;
}

// ---------------------------------------------------------------
// 2) Build a team-pair -> wc_matches.id lookup so we can deep-link.
//    WC fixtures pair teams uniquely per stage; a sorted pair key
//    avoids any IST vs UTC date-offset headaches.
// ---------------------------------------------------------------
$database = new Database();
$db = $database->getConnection();

$matchIndex = array();
try {
    $stmt = $db->query(
        "SELECT m.id, ta.short_code AS code_a, tb.short_code AS code_b
           FROM wc_matches m
           JOIN wc_teams ta ON ta.id = m.team_a_id
           JOIN wc_teams tb ON tb.id = m.team_b_id
          WHERE m.discontinue = 'false'"
    );
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $pair = array(strtoupper($row['code_a']), strtoupper($row['code_b']));
        sort($pair);
        $matchIndex[$pair[0] . '|' . $pair[1]] = (int)$row['id'];
    }
} catch (Exception $e) {
    // DB lookup is best-effort — keep going without deep-linking.
    $matchIndex = array();
}

// ---------------------------------------------------------------
// 3) Trim ESPN events into our shape and bucket by state.
// ---------------------------------------------------------------
function pickSide($competitors, $side) {
    foreach ($competitors as $c) {
        if (isset($c['homeAway']) && $c['homeAway'] === $side) return $c;
    }
    return null;
}

$live      = array();
$completed = array();
$upcoming  = array();

foreach ($data['events'] as $ev) {
    if (empty($ev['competitions'][0])) continue;
    $comp   = $ev['competitions'][0];
    $status = isset($comp['status']) ? $comp['status'] : array();
    $type   = isset($status['type']) ? $status['type'] : array();
    $state  = isset($type['state']) ? $type['state'] : 'pre';

    $home = pickSide($comp['competitors'], 'home');
    $away = pickSide($comp['competitors'], 'away');
    if (!$home || !$away) continue;

    $kickoff = isset($comp['date']) ? $comp['date'] : '';
    $codeH   = isset($home['team']['abbreviation']) ? strtoupper($home['team']['abbreviation']) : '';
    $codeA   = isset($away['team']['abbreviation']) ? strtoupper($away['team']['abbreviation']) : '';
    $pair    = array($codeH, $codeA);
    sort($pair);
    $key     = $pair[0] . '|' . $pair[1];
    $matchId = isset($matchIndex[$key]) ? $matchIndex[$key] : null;

    $event = array(
        "espn_id"        => isset($ev['id']) ? (string)$ev['id'] : '',
        "match_id"       => $matchId,
        "state"          => $state,
        "description"    => isset($type['description']) ? $type['description'] : '',
        "display_clock"  => isset($status['displayClock']) ? $status['displayClock'] : '',
        "kickoff_at"     => $kickoff,
        "venue"          => isset($comp['venue']['fullName']) ? $comp['venue']['fullName'] : '',
        "home_code"      => $codeH,
        "home_name"      => isset($home['team']['displayName']) ? $home['team']['displayName'] : '',
        "home_score"     => isset($home['score']) ? (string)$home['score'] : '0',
        "home_logo"      => isset($home['team']['logo']) ? $home['team']['logo'] : '',
        "away_code"      => $codeA,
        "away_name"      => isset($away['team']['displayName']) ? $away['team']['displayName'] : '',
        "away_score"     => isset($away['score']) ? (string)$away['score'] : '0',
        "away_logo"      => isset($away['team']['logo']) ? $away['team']['logo'] : '',
    );

    if ($state === 'in') {
        $live[] = $event;
    } else if ($state === 'post') {
        $completed[] = $event;
    } else {
        $upcoming[] = $event;
    }
}

echo json_encode(array(
    "fetched_at"         => gmdate('Y-m-d\TH:i:s\Z'),
    "cache_age_s"        => $cacheAge,
    "live"               => $live,
    "recently_completed" => $completed,
    "upcoming_today"     => $upcoming,
));
