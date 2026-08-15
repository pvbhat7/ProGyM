<?php
    // Overall World Cup leaderboard — tiebreaker = most matches predicted (engagement).
    // Reads denormalized stats from wc_participants for fast querying.

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

    // Gym-admin (Pranav Patil, mobile 8796655176) is excluded from the public
    // leaderboard — he ran the tournament and self-eliminated so members compete
    // on a level field. Ranks below re-number to avoid gaps.
    $excludedIds = array();
    $st = $db->prepare("SELECT id FROM client WHERE mobile = ? LIMIT 1");
    $st->execute(['8796655176']);
    if ($eid = $st->fetchColumn()) $excludedIds[(string)$eid] = true;

    // Admin-only mobile + coupon reveal: if the caller's client_id maps to the
    // gym-admin mobile, attach each user's mobile and thank-you coupon so
    // Pranav can WhatsApp participants directly. Non-admin callers never see
    // mobiles/coupons.
    $isAdminCaller = false;
    $callerId = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if ($callerId > 0) {
        $st2 = $db->prepare("SELECT mobile FROM client WHERE id = ? LIMIT 1");
        $st2->execute([$callerId]);
        $mob = $st2->fetchColumn();
        if ($mob !== false) {
            $digits = preg_replace('/\D/', '', (string)$mob);
            if (substr($digits, -10) === '8796655176') $isAdminCaller = true;
        }
    }

    $item = new WcParticipant($db);
    $stmt = $item->getOverallLeaderboard($limit);

    $rows = array();
    $rank = 0;
    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)){
        if (isset($excludedIds[(string)$r['client_id']])) continue;
        $rank++;
        $rows[] = array(
            "rank"                    => $rank,
            "client_id"               => $r['client_id'],
            "client_name"             => $r['client_name'],
            "client_photo"            => $r['client_photo'],
            "was_gym_client_at_join"  => $r['was_gym_client_at_join'],
            "total_coins_earned"      => (float)$r['total_coins_earned'],
            "total_matches_predicted" => (int)$r['total_matches_predicted'],
            "predictions_placed"      => (int)$r['predictions_placed'],
            "joined_at"               => $r['joined_at']
        );
    }

    if ($isAdminCaller && count($rows) > 0) {
        $ids = array_column($rows, 'client_id');
        $ph  = implode(',', array_fill(0, count($ids), '?'));
        $st3 = $db->prepare("SELECT id, mobile FROM client WHERE id IN ($ph)");
        $st3->execute($ids);
        $mobMap = array();
        foreach ($st3->fetchAll(PDO::FETCH_ASSOC) as $rr) $mobMap[(string)$rr['id']] = $rr['mobile'];

        $st4 = $db->prepare("SELECT client_id, fifa_coupon, fifa_discount_percent
                             FROM wc_participants WHERE client_id IN ($ph)");
        $st4->execute($ids);
        $couponMap   = array();
        $discountMap = array();
        foreach ($st4->fetchAll(PDO::FETCH_ASSOC) as $rr) {
            $couponMap[(string)$rr['client_id']]   = $rr['fifa_coupon'];
            $discountMap[(string)$rr['client_id']] = isset($rr['fifa_discount_percent'])
                ? (int)$rr['fifa_discount_percent'] : 50;
        }

        foreach ($rows as &$row) {
            $row['client_mobile']         = $mobMap[(string)$row['client_id']]      ?? null;
            $row['fifa_coupon']           = $couponMap[(string)$row['client_id']]   ?? null;
            $row['fifa_discount_percent'] = $discountMap[(string)$row['client_id']] ?? 50;
        }
        unset($row);
    }

    echo json_encode(array(
        "limit"           => $limit,
        "count"           => count($rows),
        "leaderboard"     => $rows,
        "is_admin_caller" => $isAdminCaller,
    ));
?>
