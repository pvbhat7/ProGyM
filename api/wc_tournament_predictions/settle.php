<?php
/**
 * Admin endpoint — declares the 4 actual tournament award winners and awards
 * coins to every matching prediction in one shot. Idempotent in spirit:
 * predictions with settled_at already set are skipped, so re-running this is safe.
 *
 * Request body (POST JSON):
 *   {
 *     "actual_winner_team_id":         12,
 *     "actual_golden_ball_player_id":  345,
 *     "actual_golden_boot_player_id":  678,
 *     "actual_golden_glove_player_id": 910
 *   }
 *
 * Returns: count of users awarded + total coins distributed.
 */

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

$winner_id = isset($data->actual_winner_team_id)         ? (int)$data->actual_winner_team_id         : 0;
$ball_id   = isset($data->actual_golden_ball_player_id)  ? (int)$data->actual_golden_ball_player_id  : 0;
$boot_id   = isset($data->actual_golden_boot_player_id)  ? (int)$data->actual_golden_boot_player_id  : 0;
$glove_id  = isset($data->actual_golden_glove_player_id) ? (int)$data->actual_golden_glove_player_id : 0;

if ($winner_id <= 0 || $ball_id <= 0 || $boot_id <= 0 || $glove_id <= 0){
    http_response_code(400);
    echo json_encode(array("message" => "All 4 actual award IDs are required."));
    exit;
}

try {
    $db->beginTransaction();
    $obj = new WcTournamentPrediction($db);
    $result = $obj->settleAll($winner_id, $ball_id, $boot_id, $glove_id);
    $db->commit();

    echo json_encode(array(
        "message"            => "Tournament awards settled.",
        "users_awarded"      => $result['users_awarded'],
        "coins_distributed"  => $result['coins_distributed'],
        "per_user"           => $result['per_user'],
    ));
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(array("message" => "Settle failed: " . $e->getMessage()));
}
?>
