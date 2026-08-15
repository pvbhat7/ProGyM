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
    $id   = isset($data->id) ? (int)$data->id : 0;

    if ($id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "id is required."));
        exit;
    }

    $item = new WcMatch($db);
    $existing = $item->getMatchById($id);
    if (!$existing){
        http_response_code(404);
        echo json_encode(array("message" => "Match not found."));
        exit;
    }
    if ($existing['status'] === 'settled'){
        http_response_code(409);
        echo json_encode(array("message" => "Cannot delete a settled match."));
        exit;
    }

    if ($item->softDeleteMatch($id)){
        echo json_encode(array("id" => $id, "message" => "Match deleted (soft)."));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "Failed to delete match."));
    }
?>
