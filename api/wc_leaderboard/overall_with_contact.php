<?php
    // Admin-only variant of overall.php that ALSO returns client mobile number.
    // Used by the WC Leaderboard admin page for SMS / WhatsApp refer-and-earn reminders.
    // Kept separate so the public overall.php never exposes contact info.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcParticipant.php';

    $limit = isset($_GET['limit']) ? max(1, min(10000, (int)$_GET['limit'])) : 10000;

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcParticipant($db);
    $stmt = $item->getOverallLeaderboardWithContact($limit);

    $rows = array();
    $rank = 0;
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        $rank++;
        $rows[] = array(
            "rank"                    => $rank,
            "client_id"               => $r['client_id'],
            "client_name"             => $r['client_name'],
            "client_photo"            => $r['client_photo'],
            "client_mobile"           => $r['client_mobile'],
            "referral_code"           => $r['referral_code'],
            "sms_reminder_sent_at"            => $r['sms_reminder_sent_at'],
            "whatsapp_reminder_sent_at"       => $r['whatsapp_reminder_sent_at'],
            "match_reminder_sms_sent_at"      => $r['match_reminder_sms_sent_at'],
            "match_reminder_whatsapp_sent_at" => $r['match_reminder_whatsapp_sent_at'],
            "was_gym_client_at_join"  => $r['was_gym_client_at_join'],
            "total_coins_earned"      => (float)$r['total_coins_earned'],
            "total_matches_predicted" => (int)$r['total_matches_predicted'],
            "predictions_placed"      => (int)$r['predictions_placed'],
            "joined_at"               => $r['joined_at']
        );
    }

    // Enrich each row with the FIFA thank-you coupon + discount tier +
    // redemption timestamp so the admin leaderboard can render a copy button
    // and quickly see who has already been credited.
    if (count($rows) > 0) {
        $ids = array_column($rows, 'client_id');
        $ph  = implode(',', array_fill(0, count($ids), '?'));
        $st  = $db->prepare("SELECT client_id, fifa_coupon, fifa_discount_percent, fifa_coupon_redeemed_at
                             FROM wc_participants WHERE client_id IN ($ph)");
        $st->execute($ids);
        $map = array();
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $rr) $map[(string)$rr['client_id']] = $rr;
        foreach ($rows as &$row) {
            $m = $map[(string)$row['client_id']] ?? null;
            $row['fifa_coupon']              = $m['fifa_coupon']              ?? null;
            $row['fifa_discount_percent']    = $m ? (int)($m['fifa_discount_percent'] ?? 50) : 50;
            $row['fifa_coupon_redeemed_at']  = $m['fifa_coupon_redeemed_at']  ?? null;
        }
        unset($row);
    }

    echo json_encode(array(
        "limit"        => $limit,
        "count"        => count($rows),
        "leaderboard"  => $rows
    ));
?>
