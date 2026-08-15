<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
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

    $data = json_decode(file_get_contents("php://input"));

    $client_id       = isset($data->client_id)                   ? (int)$data->client_id                   : 0;
    $winner_team_id  = isset($data->pred_winner_team_id)         ? (int)$data->pred_winner_team_id         : 0;
    $ball_player_id  = isset($data->pred_golden_ball_player_id)  ? (int)$data->pred_golden_ball_player_id  : 0;
    $boot_player_id  = isset($data->pred_golden_boot_player_id)  ? (int)$data->pred_golden_boot_player_id  : 0;
    $glove_player_id = isset($data->pred_golden_glove_player_id) ? (int)$data->pred_golden_glove_player_id : 0;

    // ----- All 4 picks are mandatory -----
    $missing = array();
    if ($client_id       <= 0) $missing[] = 'client_id';
    if ($winner_team_id  <= 0) $missing[] = 'World Cup Winner';
    if ($ball_player_id  <= 0) $missing[] = 'Golden Ball';
    if ($boot_player_id  <= 0) $missing[] = 'Golden Boot';
    if ($glove_player_id <= 0) $missing[] = 'Golden Glove';
    if (!empty($missing)){
        http_response_code(400);
        echo json_encode(array("message" => "Please fill all 4 picks. Missing: " . implode(', ', $missing) . "."));
        exit;
    }

    // ----- Lock cutoff (config/features.json -> awards_lock_at) -----
    $featuresPath = __DIR__ . '/../../config/features.json';
    $features     = file_exists($featuresPath) ? json_decode(file_get_contents($featuresPath), true) : array();
    $lockAtStr    = isset($features['awards_lock_at']) ? trim((string)$features['awards_lock_at']) : '';
    if ($lockAtStr !== ''){
        try {
            $lockAt = new DateTime($lockAtStr, new DateTimeZone('Asia/Calcutta'));
            $nowDt  = new DateTime('now',      new DateTimeZone('Asia/Calcutta'));
            if ($nowDt >= $lockAt){
                http_response_code(403);
                echo json_encode(array("message" => "Tournament award picks are now locked."));
                exit;
            }
        } catch (Exception $e) { /* bad config — fail open */ }
    }

    // ----- One-shot submission (UNIQUE on client_id) -----
    $obj = new WcTournamentPrediction($db);
    $existing = $obj->getByClientId($client_id);
    if ($existing){
        http_response_code(409);
        echo json_encode(array(
            "message"      => "You have already submitted your tournament picks. They cannot be changed.",
            "already_submitted" => true,
            "prediction"   => $existing,
        ));
        exit;
    }

    // ----- Validate referenced rows exist -----
    $chk = $db->prepare("SELECT 1 FROM wc_teams WHERE id = :id AND discontinue = 'false'");
    $chk->bindParam(':id', $winner_team_id, PDO::PARAM_INT);
    $chk->execute();
    if (!$chk->fetchColumn()){
        http_response_code(400);
        echo json_encode(array("message" => "Selected winner team is invalid."));
        exit;
    }

    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM wc_players
          WHERE id IN (:b, :o, :g) AND discontinue = 'false'"
    );
    $stmt->bindParam(':b', $ball_player_id,  PDO::PARAM_INT);
    $stmt->bindParam(':o', $boot_player_id,  PDO::PARAM_INT);
    $stmt->bindParam(':g', $glove_player_id, PDO::PARAM_INT);
    $stmt->execute();
    $found = (int)$stmt->fetchColumn();
    // 3 distinct players → 3; but a user could pick the same player for multiple (e.g. ball+boot).
    $distinct = count(array_unique(array($ball_player_id, $boot_player_id, $glove_player_id)));
    if ($found < $distinct){
        http_response_code(400);
        echo json_encode(array("message" => "One or more selected players are invalid."));
        exit;
    }

    try {
        $ok = $obj->submit($client_id, $winner_team_id, $ball_player_id, $boot_player_id, $glove_player_id);
        if (!$ok){
            http_response_code(500);
            echo json_encode(array("message" => "Could not save your picks. Please try again."));
            exit;
        }
        $saved = $obj->getByClientId($client_id);
        echo json_encode(array(
            "message"    => "Locked in! Your tournament award picks are saved.",
            "submitted"  => true,
            "prediction" => $saved,
        ));
    } catch (PDOException $e) {
        // UNIQUE violation if user double-submits in a race
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(array(
                "message" => "You have already submitted your tournament picks. They cannot be changed.",
                "already_submitted" => true,
            ));
            exit;
        }
        http_response_code(500);
        echo json_encode(array("message" => "Database error: " . $e->getMessage()));
    }
?>
