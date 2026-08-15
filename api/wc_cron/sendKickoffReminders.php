<?php
/**
 * Cron — sends a "Match starting soon" push to every wc2026 participant
 * who hasn't yet predicted on a match that kicks off in the next ~30 min.
 *
 * Trigger (Hostinger cron, every 5 minutes — same shared secret as autoSettle):
 *   curl -s "https://tavrostechinfo.com/PROGYM/ggs/api/wc_cron/sendKickoffReminders.php?key=wcCron_8Hk2Mq4Tn9pXr"
 *
 * Logic:
 *   - Find wc_matches where kickoff_at is between NOW+25min and NOW+35min,
 *     status='upcoming', discontinue='false'. The 10-min window is wide enough
 *     to survive cron drift / occasional missed runs without missing a match.
 *   - For each such match, find every wc_participants client_id that does NOT
 *     have a row in wc_predictions for that match.
 *   - Send one push per such client. Dedup via wc_notifications_log.event_key
 *     "kickoff:match:{matchId}:client:{clientId}".
 *
 * Idempotency: re-running within the 10-min window is safe — sends are
 * skipped because event_key already exists.
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
include_once '../../class/WcFcmSender.php';

$database = new Database();
$db = $database->getConnection();

// kickoff_at is stored as DATETIME (server-local). Use DB clock for the window.
$matchStmt = $db->query(
    "SELECT m.id, m.kickoff_at,
            ta.name AS name_a, tb.name AS name_b,
            ta.short_code AS code_a, tb.short_code AS code_b,
            TIMESTAMPDIFF(MINUTE, NOW(), m.kickoff_at) AS mins_to_kick
       FROM wc_matches m
       JOIN wc_teams ta ON ta.id = m.team_a_id
       JOIN wc_teams tb ON tb.id = m.team_b_id
      WHERE m.discontinue = 'false'
        AND m.status      = 'upcoming'
        AND m.kickoff_at BETWEEN DATE_ADD(NOW(), INTERVAL 25 MINUTE)
                              AND DATE_ADD(NOW(), INTERVAL 35 MINUTE)"
);

$matches = $matchStmt->fetchAll(PDO::FETCH_ASSOC);

$totalPushed = 0;
$details     = array();

foreach ($matches as $m) {
    $matchId = (int)$m['id'];
    $label   = $m['name_a'] . ' vs ' . $m['name_b'];

    // Participants who have NOT predicted on this match yet.
    $sql = "SELECT pa.client_id
              FROM wc_participants pa
             WHERE NOT EXISTS (
                       SELECT 1 FROM wc_predictions p
                        WHERE p.client_id = pa.client_id
                          AND p.match_id  = :mid
                   )";
    $stmt = $db->prepare($sql);
    $stmt->bindValue(':mid', $matchId, PDO::PARAM_INT);
    $stmt->execute();

    $clientIds = array();
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) $clientIds[] = (int)$r['client_id'];

    if (empty($clientIds)) {
        $details[] = array('match_id' => $matchId, 'label' => $label, 'eligible' => 0);
        continue;
    }

    $sumRes = WcFcmSender::sendToClients(
        $db,
        $clientIds,
        '⏰ Match starting in ~30 min',
        $label . ' — lock in your pick before kickoff.',
        array(
            'click_action' => WcFcmSender::FRONTEND_BASE_URL . '/match/' . $matchId,
            'match_id'     => (string)$matchId,
        ),
        'kickoff_reminder',
        'kickoff:match:' . $matchId
    );

    $totalPushed += isset($sumRes['total_sent']) ? $sumRes['total_sent'] : 0;
    $details[] = array(
        'match_id' => $matchId,
        'label'    => $label,
        'eligible' => count($clientIds),
        'pushed'   => $sumRes,
    );
}

echo json_encode(array(
    'fetched_at'    => gmdate('Y-m-d\TH:i:s\Z'),
    'matches_found' => count($matches),
    'total_pushed'  => $totalPushed,
    'details'       => $details,
));
?>
