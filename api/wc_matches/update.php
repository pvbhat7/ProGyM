<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcMatch.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));

    $id         = isset($data->id)         ? (int)$data->id         : 0;
    $team_a_id  = isset($data->team_a_id)  ? (int)$data->team_a_id  : 0;
    $team_b_id  = isset($data->team_b_id)  ? (int)$data->team_b_id  : 0;
    $stage      = isset($data->stage)      ? trim($data->stage)     : '';
    $multiplier = isset($data->multiplier) ? (float)$data->multiplier : 0;
    $kickoff_at = isset($data->kickoff_at) ? trim($data->kickoff_at): '';

    if ($id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "id is required."));
        exit;
    }
    if ($team_a_id <= 0 || $team_b_id <= 0 || $team_a_id === $team_b_id){
        http_response_code(400);
        echo json_encode(array("message" => "Valid distinct team_a_id and team_b_id are required."));
        exit;
    }
    $allowedStages = array('group','r16','qf','sf','final');
    if (!in_array($stage, $allowedStages, true)){
        http_response_code(400);
        echo json_encode(array("message" => "stage must be one of: " . implode(',', $allowedStages)));
        exit;
    }
    // Stage multipliers removed — every match is a flat 20 base. Force to 1.
    $multiplier = 1;
    if ($kickoff_at === ''){
        http_response_code(400);
        echo json_encode(array("message" => "kickoff_at is required (YYYY-MM-DD HH:MM:SS)."));
        exit;
    }

    $item = new WcMatch($db);

    // Block updates if match is already settled (class also enforces this, but report a clean message).
    $existing = $item->getMatchById($id);
    if (!$existing){
        http_response_code(404);
        echo json_encode(array("message" => "Match not found."));
        exit;
    }
    if ($existing['status'] === 'settled'){
        http_response_code(409);
        echo json_encode(array("message" => "Cannot edit a settled match."));
        exit;
    }

    $ok = $item->updateMatch($id, $team_a_id, $team_b_id, $stage, $multiplier, $kickoff_at);
    if ($ok){
        echo json_encode(array("id" => $id, "message" => "Match updated."));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to update match."));
    }
?>
