<?php
/**
 * POST { clientId, plan, inputs, model } → { id }
 * Saves the (admin-reviewed) plan as the member's active plan; the previous one is archived.
 */
include_once __DIR__ . '/_common.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') diet_fail(405, 'POST only');
list($db, $mobile) = diet_admin();

$in = diet_json();
$clientId = isset($in['clientId']) ? (int)$in['clientId'] : 0;
if ($clientId <= 0 || !AiDietPlan::member($db, $clientId)) diet_fail(404, 'Member not found.');
if (empty($in['plan']) || !is_array($in['plan'])) diet_fail(400, 'Nothing to save.');

try {
    $inputs = AiDietPlan::cleanInputs(isset($in['inputs']) && is_array($in['inputs']) ? $in['inputs'] : array());
    $id = AiDietPlan::save($db, $clientId, $in['plan'], $inputs, $mobile, isset($in['model']) ? (string)$in['model'] : null);
} catch (Exception $e) {
    diet_fail(400, $e->getMessage());
}
echo json_encode(array('id' => $id));
