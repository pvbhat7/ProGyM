<?php
// Public Knockout Bonanza leaderboard. Sorted by total points (settled rows
// + Perfect Bracket bonus), then by tiebreaker diff (if all 4 matches settled).
//
// GET /api/wc_special/leaderboard.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once '../../config/database.php';
include_once '../../class/WcSpecialPrediction.php';

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }

$sp = new WcSpecialPrediction($db);
$res = $sp->getLeaderboard();

$client_id    = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
$isEliminated = $client_id > 0 ? $sp->isEliminated($client_id) : false;

// Reveal full mobile numbers on rows only for the hard-coded gym admin caller
// (mobile 8796655176 — Pranav Patil). Used to drive per-row SMS/WhatsApp buttons.
$isAdminCaller = false;
if ($client_id > 0) {
    $st = $db->prepare("SELECT mobile FROM client WHERE id = ? LIMIT 1");
    $st->execute([$client_id]);
    $mob = $st->fetchColumn();
    if ($mob !== false) {
        $digits = preg_replace('/\D/', '', (string)$mob);
        if (substr($digits, -10) === '8796655176') $isAdminCaller = true;
    }
}

$rows = $res['rows'];
if ($isAdminCaller) {
    $ids = array_column($rows, 'client_id');
    if (count($ids) > 0) {
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $st = $db->prepare("SELECT id, mobile FROM client WHERE id IN ($ph)");
        $st->execute($ids);
        $mobMap = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) $mobMap[(int)$r['id']] = $r['mobile'];
        foreach ($rows as &$r) {
            $r['client_mobile'] = $mobMap[(int)$r['client_id']] ?? null;
        }
        unset($r);
    }
}

echo json_encode([
    'ok'                 => true,
    'rows'               => $rows,
    'actual_total_goals' => $res['actual_total_goals'],
    'top_n'              => 3,
    'is_eliminated'      => $isEliminated,
    'is_admin_caller'    => $isAdminCaller,
]);
?>
