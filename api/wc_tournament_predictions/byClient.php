<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    include_once '../../config/database.php';
    include_once '../../class/WcTournamentPrediction.php';

    $database = new Database();
    $db = $database->getConnection();

    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    if ($client_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "client_id is required."));
        exit;
    }

    // Lock cutoff (optional) — config/features.json -> awards_lock_at (YYYY-MM-DD HH:MM:SS, IST).
    $featuresPath = __DIR__ . '/../../config/features.json';
    $features     = file_exists($featuresPath) ? json_decode(file_get_contents($featuresPath), true) : array();
    $lockAtStr    = isset($features['awards_lock_at']) ? trim((string)$features['awards_lock_at']) : '';
    $lockedNow    = false;
    if ($lockAtStr !== ''){
        try {
            $lockAt = new DateTime($lockAtStr, new DateTimeZone('Asia/Calcutta'));
            $nowDt  = new DateTime('now',      new DateTimeZone('Asia/Calcutta'));
            $lockedNow = $nowDt >= $lockAt;
        } catch (Exception $e) { /* bad config — leave unlocked */ }
    }

    $obj = new WcTournamentPrediction($db);
    $row = $obj->getByClientId($client_id);

    echo json_encode(array(
        "prediction"   => $row ?: null,
        "submitted"    => $row ? true : false,
        "lock_at"      => $lockAtStr,
        "locked_now"   => $lockedNow,
        "points" => array(
            "winner" => WC_AWARD_WINNER_COINS,
            "ball"   => WC_AWARD_GOLDEN_BALL_COINS,
            "boot"   => WC_AWARD_GOLDEN_BOOT_COINS,
            "glove"  => WC_AWARD_GOLDEN_GLOVE_COINS,
        )
    ));
?>
