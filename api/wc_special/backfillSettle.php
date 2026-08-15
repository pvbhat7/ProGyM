<?php
/**
 * One-shot backfill — grade any already-settled Bonanza match (M101-M104)
 * whose wc_special_predictions rows never got graded because the ESPN
 * auto-settler wasn't wired to call WcSpecialPrediction::settleAllForMatch().
 *
 * Safe to re-run (settleAllForMatch is idempotent — same inputs produce same
 * points). Delete this file from the server after the one-time backfill.
 *
 * Usage (one-off):
 *   curl "https://tavrostechinfo.com/PROGYM/ggs/api/wc_special/backfillSettle.php?key=wcCron_8Hk2Mq4Tn9pXr"
 */

header("Content-Type: application/json; charset=UTF-8");

define('CRON_SECRET', 'wcCron_8Hk2Mq4Tn9pXr');
$key = isset($_GET['key']) ? $_GET['key'] : '';
if (!hash_equals(CRON_SECRET, $key)) {
    http_response_code(403);
    echo json_encode(["message" => "Forbidden."]);
    exit;
}

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(["ok" => false, "error" => "db"]); exit; }

$stmt = $db->query(
    "SELECT id FROM wc_matches
      WHERE id IN (101, 102, 103, 104)
        AND status = 'settled'
      ORDER BY id ASC"
);
$settledIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

$sp      = new WcSpecialPrediction($db);
$results = [];
foreach ($settledIds as $mid) {
    try {
        $results[] = ['match_id' => $mid, 'result' => $sp->settleAllForMatch($mid)];
    } catch (Exception $e) {
        $results[] = ['match_id' => $mid, 'error' => $e->getMessage()];
    }
}

echo json_encode([
    "ok"                 => true,
    "settled_bonanza_ids"=> $settledIds,
    "results"            => $results,
]);
?>
