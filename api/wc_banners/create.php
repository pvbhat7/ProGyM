<?php
/**
 * Admin — creates a sponsored banner. Accepts a base64-encoded image,
 * writes it to /wc_banners/ on the server, then inserts a row pointing
 * at the public URL.
 *
 * Body JSON:
 *   {
 *     "image_base64": "iVBORw0KGgo...",  // raw base64 (no data: prefix)
 *     "extension":    "png" | "jpg" | "jpeg" | "webp",
 *     "sponsor_name": "Royal Cafe",      // optional
 *     "link_url":     "https://...",     // optional click target
 *     "display_order": 0                  // optional, default 0
 *   }
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) { http_response_code(400); echo json_encode(array('message' => 'Bad JSON.')); exit; }

$b64       = isset($data['image_base64']) ? $data['image_base64'] : '';
$ext       = isset($data['extension'])    ? strtolower(trim($data['extension'])) : 'png';
$sponsor   = isset($data['sponsor_name']) ? trim($data['sponsor_name']) : null;
$link      = isset($data['link_url'])     ? trim($data['link_url'])     : null;
$order     = isset($data['display_order']) ? (int)$data['display_order'] : 0;

if ($b64 === '') { http_response_code(400); echo json_encode(array('message' => 'image_base64 required.')); exit; }
if (!in_array($ext, array('png','jpg','jpeg','webp','gif'), true)) {
    http_response_code(400);
    echo json_encode(array('message' => 'extension must be png/jpg/jpeg/webp/gif.'));
    exit;
}

// Strip data URL prefix defensively in case the caller forgot.
if (strpos($b64, 'base64,') !== false) {
    $b64 = substr($b64, strpos($b64, 'base64,') + 7);
}
$bytes = base64_decode($b64, true);
if ($bytes === false) {
    http_response_code(400);
    echo json_encode(array('message' => 'image_base64 is not valid base64.'));
    exit;
}

// Save under /wc_banners/ at the document root.
// __DIR__ here = .../public_html/PROGYM/ggs/api/wc_banners
// We climb up to .../public_html/PROGYM/ggs/ then enter wc_banners/.
$rootDir  = realpath(__DIR__ . '/../..');
$bannerDir = $rootDir . DIRECTORY_SEPARATOR . 'wc_banners';
if (!is_dir($bannerDir)) {
    @mkdir($bannerDir, 0755, true);
}

$filename = 'wcb_' . date('YmdHis') . '_' . substr(md5(uniqid('', true)), 0, 8) . '.' . $ext;
$fullPath = $bannerDir . DIRECTORY_SEPARATOR . $filename;
if (file_put_contents($fullPath, $bytes) === false) {
    http_response_code(500);
    echo json_encode(array('message' => 'Could not write banner file.'));
    exit;
}

// Public URL — assumes the server hosts /PROGYM/ggs/wc_banners/...
$publicUrl = 'https://tavrostechinfo.com/PROGYM/ggs/wc_banners/' . $filename;

$database = new Database();
$db = $database->getConnection();

$stmt = $db->prepare(
    "INSERT INTO wc_banners (image_url, sponsor_name, link_url, display_order, is_active, created_at, updated_at)
     VALUES (:u, :s, :l, :o, 'yes', NOW(), NOW())"
);
$stmt->bindParam(':u', $publicUrl);
$stmt->bindParam(':s', $sponsor);
$stmt->bindParam(':l', $link);
$stmt->bindParam(':o', $order, PDO::PARAM_INT);
$stmt->execute();

$insertId = (int)$db->lastInsertId();

echo json_encode(array(
    'ok'           => true,
    'id'           => $insertId,
    'image_url'    => $publicUrl,
    'sponsor_name' => $sponsor,
    'link_url'     => $link,
    'display_order'=> $order,
    'is_active'    => 'yes',
));
?>
