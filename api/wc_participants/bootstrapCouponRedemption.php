<?php
// One-shot: add `fifa_coupon_redeemed_at` column to wc_participants so we can
// enforce one-time coupon use. Idempotent — safe to call multiple times.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include_once '../../config/database.php';

$db = (new Database())->getConnection();
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $exists = $db->query("SHOW COLUMNS FROM `wc_participants` LIKE 'fifa_coupon_redeemed_at'")->fetch(PDO::FETCH_ASSOC);
    if (!$exists) {
        $db->exec("ALTER TABLE `wc_participants` ADD COLUMN `fifa_coupon_redeemed_at` DATETIME NULL DEFAULT NULL AFTER `fifa_coupon`");
        echo json_encode(['ok' => true, 'status' => 'added']);
    } else {
        echo json_encode(['ok' => true, 'status' => 'already_present']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
?>
