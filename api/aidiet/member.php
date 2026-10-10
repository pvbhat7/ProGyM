<?php
/**
 * GET ?id=<clientId>  → { member: {id,name,gender,age,height_cm,weight_kg,last_inputs}, plans: [...] }
 * GET (no id)         → { recent: [{id, client_id, name, title, created_at}] }  latest active plans
 * Admin only (Firebase ID token).
 */
include_once __DIR__ . '/_common.php';
list($db) = diet_admin();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    echo json_encode(array('recent' => AiDietPlan::recent($db)), JSON_UNESCAPED_UNICODE);
    exit;
}
$member = AiDietPlan::member($db, $id);
if (!$member) diet_fail(404, 'Member not found.');
echo json_encode(array('member' => $member, 'plans' => AiDietPlan::forMember($db, $id)), JSON_UNESCAPED_UNICODE);
