<?php
/**
 * GET /api/wc_teams/all.php
 * Returns every active team (id, name, short_code, flag, group_name).
 * Used by both admin (match management) and the player app's Teams page.
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
    "SELECT id, name, short_code, flag, group_name
       FROM wc_teams
      WHERE discontinue = 'false'
      ORDER BY group_name ASC, name ASC"
);

$rows = array();
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $rows[] = array(
        "id"         => $r['id'],
        "name"       => $r['name'],
        "short_code" => $r['short_code'],
        "flag"       => $r['flag'],
        "group_name" => $r['group_name'],
    );
}

echo json_encode($rows);
?>
