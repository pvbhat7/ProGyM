<?php
/**
 * Admin — updates metadata on an existing banner. Image swap is done by
 * deleting + re-creating (admin UI handles that flow).
 *
 * Body JSON:
 *   {
 *     "id":            12,
 *     "sponsor_name":  "Updated name",   // optional
 *     "link_url":      "https://...",    // optional
 *     "display_order": 3,                 // optional
 *     "is_active":     "yes" | "no"       // optional
 *   }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$id   = isset($data['id']) ? (int)$data['id'] : 0;
if ($id <= 0) { http_response_code(400); echo json_encode(array('message' => 'id required.')); exit; }

$database = new Database();
$db = $database->getConnection();

$sets   = array();
$params = array(':id' => $id);

if (array_key_exists('sponsor_name', $data)) {
    $sets[] = "sponsor_name = :s";
    $params[':s'] = $data['sponsor_name'] !== '' ? $data['sponsor_name'] : null;
}
if (array_key_exists('link_url', $data)) {
    $sets[] = "link_url = :l";
    $params[':l'] = $data['link_url'] !== '' ? $data['link_url'] : null;
}
if (array_key_exists('display_order', $data)) {
    $sets[] = "display_order = :o";
    $params[':o'] = (int)$data['display_order'];
}
if (array_key_exists('is_active', $data)) {
    $sets[] = "is_active = :a";
    $params[':a'] = ($data['is_active'] === 'yes' || $data['is_active'] === true) ? 'yes' : 'no';
}

if (empty($sets)) { echo json_encode(array('ok' => true, 'changed' => 0)); exit; }

$sets[] = "updated_at = NOW()";
$sql = "UPDATE wc_banners SET " . implode(', ', $sets) . " WHERE id = :id";

$stmt = $db->prepare($sql);
$stmt->execute($params);

echo json_encode(array('ok' => true, 'changed' => $stmt->rowCount()));
?>
