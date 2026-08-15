<?php
    // Campaign summary stats for the admin dashboard tile.
    // total_participants / member_signups / non_member_signups / converted_count / total_coins_distributed.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcParticipant.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcParticipant($db);
    $row  = $item->getCampaignSummary();

    if (!$row) $row = array();

    echo json_encode(array(
        "total_participants"      => (int)($row['total_participants']      ?? 0),
        "member_signups"          => (int)($row['member_signups']          ?? 0),
        "non_member_signups"      => (int)($row['non_member_signups']      ?? 0),
        "converted_count"         => (int)($row['converted_count']         ?? 0),
        "total_coins_distributed" => (float)($row['total_coins_distributed'] ?? 0),
    ));
?>
