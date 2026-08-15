<?php
/**
 * One-shot bootstrap + backfill for wc_participants.fifa_coupon.
 *
 * On invocation this endpoint:
 *   1. Ensures the `fifa_coupon` column exists on wc_participants (adds it if missing).
 *   2. Ensures a unique index on that column (adds it if missing).
 *   3. Backfills a deterministic thank-you coupon into every row that doesn't
 *      already have one.
 *
 * The coupon algorithm is byte-identical to couponFor() in
 * wc2026-app/src/pages/LeaderboardPage.tsx, so codes already sent to members
 * via WhatsApp will still match the row we're writing here.
 *
 * Safe to re-run: schema steps skip if already applied, and coupon updates
 * only touch rows with NULL/empty fifa_coupon.
 *
 * GET   → dry run (shows what would happen, no writes)
 * POST  → actually runs the schema + writes
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

include_once '../../config/database.php';

$dryRun = (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST');

$db = (new Database())->getConnection();
if (!$db) { http_response_code(500); echo json_encode(['ok'=>false,'error'=>'db']); exit; }
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$log = array();
function step(&$log, $name, $status, $detail = null) {
    $log[] = array('step' => $name, 'status' => $status, 'detail' => $detail);
}

function couponFor($clientId) {
    $seed = "progym-wc2026-thankyou-" . $clientId;
    $h = 5381;
    $len = strlen($seed);
    for ($i = 0; $i < $len; $i++) {
        $c = ord($seed[$i]);
        $h = ($h << 5) + $h + $c;
        $h = $h & 0xFFFFFFFF;
        if ($h & 0x80000000) $h -= 0x100000000;
    }
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $n = abs($h);
    $out = '';
    for ($i = 0; $i < 5; $i++) {
        $out .= $alphabet[$n % 32];
        $n = intdiv($n, 32) + ($i + 1) * 131;
    }
    return "PROGYM50-" . $out;
}

try {
    // Step 1: does the column exist?
    $r = $db->query("SHOW COLUMNS FROM `wc_participants` LIKE 'fifa_coupon'")->fetch(PDO::FETCH_ASSOC);
    $hasCol = (bool)$r;
    if (!$hasCol) {
        if ($dryRun) { step($log, 'add_column', 'would_add'); }
        else {
            $db->exec("ALTER TABLE `wc_participants` ADD COLUMN `fifa_coupon` VARCHAR(20) NULL DEFAULT NULL AFTER `total_coins_earned`");
            step($log, 'add_column', 'added');
            $hasCol = true;
        }
    } else {
        step($log, 'add_column', 'already_present');
    }

    // Step 2: does the unique index exist?
    $hasIdx = false;
    if ($hasCol) {
        $ix = $db->query("SHOW INDEX FROM `wc_participants` WHERE Key_name = 'uq_fifa_coupon'")->fetchAll(PDO::FETCH_ASSOC);
        $hasIdx = count($ix) > 0;
        if (!$hasIdx) {
            if ($dryRun) { step($log, 'add_unique_index', 'would_add'); }
            else {
                $db->exec("ALTER TABLE `wc_participants` ADD UNIQUE KEY `uq_fifa_coupon` (`fifa_coupon`)");
                step($log, 'add_unique_index', 'added');
                $hasIdx = true;
            }
        } else {
            step($log, 'add_unique_index', 'already_present');
        }
    }

    // Step 3: backfill
    $needed = 0; $skipped = 0; $written = 0; $sample = array();
    if ($hasCol || $dryRun) {
        // If we're in a dry run BEFORE the column has been added, we can't
        // read fifa_coupon — so pretend everyone needs one and compute samples.
        if ($dryRun && !$hasCol) {
            $rows = $db->query("SELECT client_id FROM `wc_participants`")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $needed++;
                $code = couponFor((string)$r['client_id']);
                if (count($sample) < 5) $sample[] = array('client_id'=>(int)$r['client_id'], 'coupon'=>$code);
            }
            step($log, 'backfill', 'would_write', array('count' => $needed, 'sample' => $sample));
        } else {
            $rows = $db->query("SELECT client_id, fifa_coupon FROM `wc_participants`")->fetchAll(PDO::FETCH_ASSOC);
            $updates = array();
            foreach ($rows as $r) {
                if (!empty($r['fifa_coupon'])) { $skipped++; continue; }
                $needed++;
                $code = couponFor((string)$r['client_id']);
                $updates[] = array('cid' => (int)$r['client_id'], 'code' => $code);
                if (count($sample) < 5) $sample[] = array('client_id'=>(int)$r['client_id'], 'coupon'=>$code);
            }
            if ($dryRun) {
                step($log, 'backfill', 'would_write', array('count' => $needed, 'already' => $skipped, 'sample' => $sample));
            } else {
                if (count($updates) > 0) {
                    $upd = $db->prepare("UPDATE `wc_participants` SET fifa_coupon = :c WHERE client_id = :cid AND (fifa_coupon IS NULL OR fifa_coupon = '')");
                    foreach ($updates as $u) {
                        $upd->bindValue(':c',   $u['code'], PDO::PARAM_STR);
                        $upd->bindValue(':cid', $u['cid'],  PDO::PARAM_INT);
                        $upd->execute();
                        $written += $upd->rowCount();
                    }
                }
                step($log, 'backfill', 'written', array('count' => $written, 'already' => $skipped, 'sample' => $sample));
            }
        }
    }

    echo json_encode(array(
        'ok'      => true,
        'dry_run' => $dryRun,
        'steps'   => $log,
        'hint'    => $dryRun
            ? 'Everything looks OK — POST this URL to apply.'
            : 'Done. Safe to re-run; already-applied steps are skipped.',
    ), JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('ok'=>false,'error'=>$e->getMessage(),'steps'=>$log));
}
?>
