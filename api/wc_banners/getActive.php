<?php
/**
 * Public — returns active banners for the wc2026 Matches page carousel.
 * Sorted by display_order asc, then id desc.
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$stmt = $db->query(
    "SELECT id, image_url, sponsor_name, link_url, display_order
       FROM wc_banners
      WHERE is_active = 'yes'
      ORDER BY display_order ASC, id DESC"
);

$rows = array();
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $rows[] = array(
        'id'            => (int)$r['id'],
        'image_url'     => $r['image_url'],
        'sponsor_name'  => $r['sponsor_name'],
        'link_url'      => $r['link_url'],
        'display_order' => (int)$r['display_order'],
    );
}

echo json_encode(array('banners' => $rows));
?>
