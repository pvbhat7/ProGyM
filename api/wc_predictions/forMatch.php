<?php
    // Returns a single client's prediction for a single match, used to PREFILL
    // the prediction form. If the client hasn't submitted yet, returns
    // 200 with prediction=null (not 404), so the frontend can render an empty form.

    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/WcPrediction.php';

    $client_id = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
    $match_id  = isset($_GET['match_id'])  ? (int)$_GET['match_id']  : 0;

    if ($client_id <= 0 || $match_id <= 0){
        http_response_code(400);
        echo json_encode(array("message" => "Missing client_id or match_id."));
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();

    $item = new WcPrediction($db);
    $row  = $item->getPrediction($client_id, $match_id);

    echo json_encode(array(
        "client_id"  => $client_id,
        "match_id"   => $match_id,
        "prediction" => $row ? $row : null
    ));
?>
