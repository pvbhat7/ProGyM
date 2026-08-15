<?php
/**
 * One-shot bootstrap for 100% membership winners.
 *
 * On first invocation this endpoint:
 *   1. Ensures `wc_participants.fifa_discount_percent` exists (INT DEFAULT 50).
 *   2. For each client_id passed in the payload:
 *        - sets fifa_discount_percent = 100
 *        - regenerates fifa_coupon with the "PROGYM100-" prefix so admins can
 *          visually spot 100% codes at a glance.
 *
 * Skips rows that are already at 100% + PROGYM100-* coupon (idempotent).
 *
 * GET    → dry run (shows what would happen)
 * POST   { "client_ids":[534,1216,1256,1299] }  → applies
 *
 * NOTE: the resulting coupon is generated with a distinct seed so it will NOT
 * collide with the 50%-tier codes admins have already been sending.
 */
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

include_once '../../config/database.php';
$db = (new Database())->getConnection();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Same DJB2 + base32-lite algorithm shape as the 50% tier, distinct seed so
// codes never collide with existing PROGYM50-* series.
function couponFor100($clientId) {
    $seed = "progym-wc2026-100winner-" . $clientId;
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
    return "PROGYM100-" . $out;
}

$dryRun = (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST');
$body   = json_decode(file_get_contents("php://input"), true);
$ids    = isset($body['client_ids']) && is_array($body['client_ids']) ? $body['client_ids'] : array();

$log = array();
try {
    // Step 1: ensure column
    $col = $db->query("SHOW COLUMNS FROM `wc_participants` LIKE 'fifa_discount_percent'")->fetch(PDO::FETCH_ASSOC);
    if (!$col) {
        if ($dryRun) $log[] = array('step'=>'add_column','status'=>'would_add');
        else {
            $db->exec("ALTER TABLE `wc_participants` ADD COLUMN `fifa_discount_percent` INT NOT NULL DEFAULT 50 AFTER `fifa_coupon`");
            $log[] = array('step'=>'add_column','status'=>'added');
        }
    } else {
        $log[] = array('step'=>'add_column','status'=>'already_present');
    }

    // Step 2: winners
    $winners = array();
    foreach ($ids as $cid) {
        $cid = (int)$cid;
        if ($cid <= 0) continue;

        $st = $db->prepare("SELECT wp.client_id, wp.fifa_coupon, wp.fifa_discount_percent, c.name
                            FROM wc_participants wp
                            LEFT JOIN client c ON c.id = wp.client_id
                            WHERE wp.client_id = ?");
        $st->execute([$cid]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $winners[] = array('client_id'=>$cid, 'status'=>'not_a_participant');
            continue;
        }

        $newCode      = couponFor100($cid);
        $alreadyDone  = ((int)($row['fifa_discount_percent'] ?? 50) === 100)
                        && ($row['fifa_coupon'] === $newCode);

        if ($alreadyDone) {
            $winners[] = array('client_id'=>$cid, 'name'=>$row['name'], 'coupon'=>$row['fifa_coupon'], 'status'=>'already_100');
            continue;
        }

        if ($dryRun) {
            $winners[] = array('client_id'=>$cid, 'name'=>$row['name'],
                               'old_coupon'=>$row['fifa_coupon'], 'new_coupon'=>$newCode,
                               'status'=>'would_upgrade');
        } else {
            $upd = $db->prepare("UPDATE wc_participants
                                 SET fifa_discount_percent = 100,
                                     fifa_coupon = ?
                                 WHERE client_id = ?");
            $upd->execute([$newCode, $cid]);
            $winners[] = array('client_id'=>$cid, 'name'=>$row['name'],
                               'coupon'=>$newCode, 'status'=>'upgraded');
        }
    }

    $log[] = array('step'=>'winners', 'status'=>($dryRun?'preview':'applied'), 'winners'=>$winners);
    echo json_encode(array('ok'=>true, 'dry_run'=>$dryRun, 'steps'=>$log), JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('ok'=>false, 'error'=>$e->getMessage(), 'steps'=>$log));
}
?>
