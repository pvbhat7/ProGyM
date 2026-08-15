<?php
/**
 * Admin — deletes a banner (DB row + the image file).
 *
 * Body JSON:  { "id": 12 }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$id   = isset($data['id']) ? (int)$data['id'] : 0;
if ($id <= 0) { http_response_code(400); echo json_encode(array('message' => 'id required.')); exit; }

$database = new Database();
$db = $database->getConnection();

// Get image URL so we can delete the underlying file.
$find = $db->prepare("SELECT image_url FROM wc_banners WHERE id = :id");
$find->bindParam(':id', $id, PDO::PARAM_INT);
$find->execute();
$row = $find->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    http_response_code(404);
    echo json_encode(array('message' => 'Banner not found.'));
    exit;
}

// Best-effort file delete (don't block the DB delete if it fails)
$publicPrefix = 'https://tavrostechinfo.com/PROGYM/ggs/';
$url = $row['image_url'];
if (strpos($url, $publicPrefix) === 0) {
    $relPath  = substr($url, strlen($publicPrefix));
    $rootDir  = realpath(__DIR__ . '/../..');
    $diskPath = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
    if (is_file($diskPath)) @unlink($diskPath);
}

$del = $db->prepare("DELETE FROM wc_banners WHERE id = :id");
$del->bindParam(':id', $id, PDO::PARAM_INT);
$del->execute();

echo json_encode(array('ok' => true));
?>
