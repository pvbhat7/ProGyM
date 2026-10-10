<?php
/** POST { id } → { ok } — soft-deletes a saved plan (status = 'deleted'). */
include_once __DIR__ . '/_common.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') diet_fail(405, 'POST only');
list($db) = diet_admin();

$in = diet_json();
$id = isset($in['id']) ? (int)$in['id'] : 0;
if ($id <= 0) diet_fail(400, 'Missing plan id.');
echo json_encode(array('ok' => AiDietPlan::remove($db, $id)));
