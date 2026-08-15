<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    // CORS preflight — browser sends OPTIONS before a JSON POST. Must respond
    // with 2xx and matching headers, or the actual POST is blocked client-side
    // with "Failed to fetch".
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    include_once '../../config/database.php';
    include_once '../../class/WcPrediction.php';
    include_once '../../class/WcMatch.php';
    include_once '../../class/WcParticipant.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    $client_id              = isset($data->client_id)              ? (int)$data->client_id              : 0;
    $match_id               = isset($data->match_id)               ? (int)$data->match_id               : 0;
    $pred_winner            = isset($data->pred_winner)            ? strtoupper(trim($data->pred_winner)) : null;       // A / B / DRAW
    $pred_both_score        = isset($data->pred_both_score)        ? strtoupper(trim($data->pred_both_score)) : null;   // YES / NO
    $pred_total_goals_range = isset($data->pred_total_goals_range) ? strtoupper(trim($data->pred_total_goals_range)) : null; // UNDER_2_5 / MID / OVER_4_5
    $pred_first_scorer_id   = isset($data->pred_first_scorer_id) && $data->pred_first_scorer_id ? (int)$data->pred_first_scorer_id : null;
    $pred_motm_id           = isset($data->pred_motm_id)         && $data->pred_motm_id         ? (int)$data->pred_motm_id         : null;
    $pred_score_a           = isset($data->pred_score_a)         && $data->pred_score_a !== ''  ? (int)$data->pred_score_a         : null;
    $pred_score_b           = isset($data->pred_score_b)         && $data->pred_score_b !== ''  ? (int)$data->pred_score_b         : null;

    // ----- Validate IDs -----
    if ($client_id <= 0 || $match_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "client_id and match_id are required."));
        exit;
    }

    // ----- Validate enums -----
    if ($pred_winner !== null            && !in_array($pred_winner, array('A','B','DRAW'), true)){
        http_response_code(400);
        echo json_encode(array("message" => "pred_winner must be A, B or DRAW."));
        exit;
    }
    if ($pred_both_score !== null        && !in_array($pred_both_score, array('YES','NO'), true)){
        http_response_code(400);
        echo json_encode(array("message" => "pred_both_score must be YES or NO."));
        exit;
    }
    if ($pred_total_goals_range !== null && !in_array($pred_total_goals_range, array('UNDER_2_5','MID','OVER_4_5'), true)){
        http_response_code(400);
        echo json_encode(array("message" => "pred_total_goals_range must be UNDER_2_5, MID or OVER_4_5."));
        exit;
    }

    // ----- All 4 core predictions are mandatory -----
    $missing = array();
    if ($pred_winner     === null)                          $missing[] = 'Match Winner';
    if ($pred_both_score === null)                          $missing[] = 'Both Teams to Score';
    if ($pred_score_a    === null || $pred_score_b === null) $missing[] = 'Exact Final Score';
    if ($pred_motm_id    === null)                          $missing[] = 'Man of the Match';
    if (!empty($missing)){
        http_response_code(400);
        echo json_encode(array("message" => "Please fill all 4 predictions. Missing: " . implode(', ', $missing) . "."));
        exit;
    }

    // ----- Global launch gate: predictions are off until admin-configured launch time -----
    // Source: config/features.json -> predictions_launch_at (YYYY-MM-DD HH:MM:SS, IST).
    // Empty/missing value means launch is live (no gate). Admin client IDs bypass the gate
    // so they can test the prediction flow before public launch.
    $featuresPath = __DIR__ . '/../../config/features.json';
    $features     = file_exists($featuresPath) ? json_decode(file_get_contents($featuresPath), true) : array();
    $launchAtStr  = isset($features['predictions_launch_at']) ? trim((string)$features['predictions_launch_at']) : '';
    $adminIdsStr  = isset($features['predictions_admin_client_ids']) ? (string)$features['predictions_admin_client_ids'] : '';
    $adminIds     = array_filter(array_map('intval', preg_split('/[\s,]+/', $adminIdsStr)));
    $isAdmin      = in_array($client_id, $adminIds, true);

    if ($launchAtStr !== '' && !$isAdmin){
        try {
            $launchAt = new DateTime($launchAtStr, new DateTimeZone('Asia/Calcutta'));
            $nowGate  = new DateTime('now', new DateTimeZone('Asia/Calcutta'));
            if ($nowGate < $launchAt){
                http_response_code(403);
                echo json_encode(array(
                    "message"           => "Predictions go live on " . $launchAt->format('d M, h:i A') . ". Sit tight!",
                    "predictions_locked"=> true,
                    "launch_at"         => $launchAt->format('Y-m-d H:i:s'),
                ));
                exit;
            }
        } catch (Exception $e){
            // Bad date in config — fail open (don't block users on a config typo).
        }
    }

    // ----- Match must exist, not be settled, and kickoff must be in the future -----
    $matchObj  = new WcMatch($db);
    $matchData = $matchObj->getMatchById($match_id);
    if (!$matchData){
        http_response_code(404);
        echo json_encode(array("message" => "Match not found."));
        exit;
    }
    if ($matchData['status'] === 'settled'){
        http_response_code(409);
        echo json_encode(array("message" => "Match already settled — predictions are closed."));
        exit;
    }
    // Compare in IST (project timezone). DB stores kickoff_at as datetime IST string.
    $now = new DateTime('now', new DateTimeZone('Asia/Calcutta'));
    $kickoff = new DateTime($matchData['kickoff_at'], new DateTimeZone('Asia/Calcutta'));

    // Admin-configurable lock window: predictions close N minutes BEFORE kickoff.
    // Source of truth: config/features.json -> prediction_lock_minutes.
    $featuresPath = __DIR__ . '/../../config/features.json';
    $features     = file_exists($featuresPath) ? json_decode(file_get_contents($featuresPath), true) : array();
    $lockMinutes  = isset($features['prediction_lock_minutes']) ? max(0, (int)$features['prediction_lock_minutes']) : 0;

    $deadline = clone $kickoff;
    if ($lockMinutes > 0){
        $deadline->modify("-{$lockMinutes} minutes");
    }
    if ($deadline <= $now){
        http_response_code(409);
        $msg = $lockMinutes > 0
            ? "Predictions are locked — closed {$lockMinutes} minutes before kickoff."
            : "Predictions are locked — kickoff has passed.";
        echo json_encode(array("message" => $msg));
        exit;
    }

    // Prediction window opens 24 hours before kickoff.
    // EXCEPTION: launch day (2026-06-17) — window is open from now for all matches that day.
    $windowOpen = clone $kickoff;
    $windowOpen->modify('-24 hours');
    $isLaunchDay = $kickoff->format('Y-m-d') === '2026-06-17';
    if (!$isLaunchDay && $now < $windowOpen){
        http_response_code(409);
        echo json_encode(array("message" => "Prediction window opens 24 hours before kickoff."));
        exit;
    }

    // ----- Auto-register the participant if they aren't already in wc_participants -----
    // Source = 'existing_member' if they are a gym client at the time of this prediction.
    $partObj = new WcParticipant($db);
    if (!$partObj->existsByClientId($client_id)){
        // Find out whether this client is already a gym member, to record the snapshot.
        $stmt = $db->prepare("SELECT isGymClient FROM client WHERE id = :id");
        $stmt->bindParam(':id', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        $clientRow = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$clientRow){
            http_response_code(404);
            echo json_encode(array("message" => "Client not found."));
            exit;
        }
        $isGym = (strtolower(trim($clientRow['isGymClient'])) === 'yes') ? 'yes' : 'no';
        $source = ($isGym === 'yes') ? 'existing_member' : 'non_member_signup';
        $partObj->registerParticipant($client_id, $source, $isGym);
    }

    // ----- Upsert the prediction -----
    $predObj = new WcPrediction($db);
    $ok = $predObj->submitPrediction(
        $client_id, $match_id,
        $pred_winner, $pred_both_score, $pred_total_goals_range,
        $pred_first_scorer_id, $pred_motm_id,
        $pred_score_a, $pred_score_b
    );

    if ($ok){
        // Return the (possibly updated) row so the client can re-render with stored values.
        $row = $predObj->getPrediction($client_id, $match_id);
        echo json_encode(array(
            "message"    => "Prediction saved.",
            "prediction" => $row
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to save prediction."));
    }
?>
