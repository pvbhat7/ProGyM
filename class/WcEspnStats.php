<?php
/**
 * Fetches an ESPN match summary and extracts a compact set of fields the
 * Match Result page renders — team stats comparison + goal-scorer timeline.
 *
 * Source endpoint:
 *   https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event={espn_event_id}
 *
 * Both the auto-settle cron and the admin backfill endpoint go through
 * fetchAndStore() so the JSON shape and column writes stay in one place.
 */

class WcEspnStats {

    const SUMMARY_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=';

    // ESPN stat keys we care about → our compact label. Order is preserved
    // when the UI iterates the resulting object, so this also drives row order.
    private static $STAT_MAP = array(
        'possessionPct'  => 'Possession',
        'totalShots'     => 'Shots',
        'shotsOnTarget'  => 'Shots on target',
        'wonCorners'     => 'Corners',
        'foulsCommitted' => 'Fouls',
        'yellowCards'    => 'Yellow cards',
        'redCards'       => 'Red cards',
        'offsides'       => 'Offsides',
        'saves'          => 'Saves',
    );

    /**
     * Raw fetch — returns decoded JSON array or null on failure.
     * Caller is responsible for retrying / logging.
     */
    public static function fetchSummary($espn_event_id) {
        $url = self::SUMMARY_BASE . urlencode($espn_event_id);
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

    /**
     * Walks the summary payload and returns ('stats' => array, 'goals' => array).
     * Caller passes the team-code orientation so 'A' / 'B' in the output line
     * up with our wc_matches.score_a / score_b orientation regardless of which
     * side ESPN calls "home".
     */
    public static function extract(array $summary, $our_team_a_code, $our_team_b_code) {
        $our_team_a_code = strtoupper($our_team_a_code);
        $our_team_b_code = strtoupper($our_team_b_code);

        // ---------- stats ----------
        $statsA = array();
        $statsB = array();

        $teamsBox = isset($summary['boxscore']['teams']) && is_array($summary['boxscore']['teams'])
                  ? $summary['boxscore']['teams']
                  : array();

        foreach ($teamsBox as $teamBlock) {
            $abbr = isset($teamBlock['team']['abbreviation']) ? strtoupper($teamBlock['team']['abbreviation']) : '';
            $stats = isset($teamBlock['statistics']) && is_array($teamBlock['statistics']) ? $teamBlock['statistics'] : array();

            $row = array();
            foreach (self::$STAT_MAP as $espnKey => $label) {
                $row[$label] = null;
                foreach ($stats as $s) {
                    $name = isset($s['name']) ? $s['name'] : '';
                    if ($name === $espnKey) {
                        $row[$label] = isset($s['displayValue']) ? (string)$s['displayValue'] : null;
                        break;
                    }
                }
            }

            if ($abbr === $our_team_a_code)      $statsA = $row;
            else if ($abbr === $our_team_b_code) $statsB = $row;
        }

        // ---------- goals ----------
        $goals = array();
        $scoringPlays = isset($summary['scoringPlays']) && is_array($summary['scoringPlays'])
                      ? $summary['scoringPlays']
                      : array();

        foreach ($scoringPlays as $p) {
            $teamAbbr = isset($p['team']['abbreviation']) ? strtoupper($p['team']['abbreviation']) : '';
            $side = ($teamAbbr === $our_team_a_code) ? 'A'
                  : (($teamAbbr === $our_team_b_code) ? 'B' : '');

            $minute = isset($p['clock']['displayValue']) ? (string)$p['clock']['displayValue'] : '';

            // Scorer name — prefer athlete display name; fall back to extracting
            // from the play text ("Player Name penalty kick. ...").
            $scorer = '';
            if (isset($p['athletesInvolved']) && is_array($p['athletesInvolved']) && !empty($p['athletesInvolved'])) {
                $a = $p['athletesInvolved'][0];
                if (isset($a['displayName']))    $scorer = (string)$a['displayName'];
                else if (isset($a['shortName'])) $scorer = (string)$a['shortName'];
            }
            if ($scorer === '' && isset($p['text'])) {
                // Best-effort: take the first chunk before " — " or ". "
                $txt = (string)$p['text'];
                $cut = preg_split('/[\.\-—–]/', $txt, 2);
                $scorer = trim($cut[0]);
            }

            $type = '';
            if (isset($p['type']['text']))      $type = (string)$p['type']['text'];
            else if (isset($p['scoringType']))  $type = (string)$p['scoringType'];

            $goals[] = array(
                'minute' => $minute,
                'side'   => $side,
                'scorer' => $scorer,
                'type'   => $type,
            );
        }

        return array('stats_a' => $statsA, 'stats_b' => $statsB, 'goals' => $goals);
    }

    /**
     * One-shot: fetch ESPN summary for a match and write stats_json /
     * goals_json / stats_fetched_at to the row. Returns ('ok' => bool,
     * 'reason' => string, 'goals_count' => int).
     *
     * Caller (cron or backfill endpoint) opens NO transaction — single UPDATE.
     */
    public static function fetchAndStore(PDO $db, $match_id) {
        $stmt = $db->prepare(
            "SELECT m.id, m.espn_event_id, ta.short_code AS code_a, tb.short_code AS code_b
               FROM wc_matches m
               JOIN wc_teams ta ON ta.id = m.team_a_id
               JOIN wc_teams tb ON tb.id = m.team_b_id
              WHERE m.id = :id"
        );
        $stmt->bindValue(':id', (int)$match_id, PDO::PARAM_INT);
        $stmt->execute();
        $m = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$m)                  return array('ok' => false, 'reason' => 'match_not_found');
        if (empty($m['espn_event_id'])) return array('ok' => false, 'reason' => 'no_espn_event_id');

        $summary = self::fetchSummary($m['espn_event_id']);
        if (!$summary)            return array('ok' => false, 'reason' => 'espn_fetch_failed');

        $ext = self::extract($summary, $m['code_a'], $m['code_b']);

        $statsJson = json_encode(array('team_a' => $ext['stats_a'], 'team_b' => $ext['stats_b']));
        $goalsJson = json_encode($ext['goals']);

        $upd = $db->prepare(
            "UPDATE wc_matches
                SET stats_json       = :s,
                    goals_json       = :g,
                    stats_fetched_at = NOW()
              WHERE id = :id"
        );
        $upd->bindValue(':s',  $statsJson);
        $upd->bindValue(':g',  $goalsJson);
        $upd->bindValue(':id', (int)$match_id, PDO::PARAM_INT);
        $upd->execute();

        return array('ok' => true, 'reason' => 'stored', 'goals_count' => count($ext['goals']));
    }
}
?>
