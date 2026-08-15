<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$period = isset($_GET['period']) ? $_GET['period'] : 'month';

// Whitelist period values to prevent SQL injection
if (!in_array($period, ['date', 'week', 'month'])) {
    $period = 'month';
}

if ($period === 'date') {
    $groupExpr  = "DATE_FORMAT(STR_TO_DATE(txnDate, '%d/%m/%Y'), '%Y%m%d')";
    $labelExpr  = "DATE_FORMAT(STR_TO_DATE(txnDate, '%d/%m/%Y'), '%d/%m/%Y')";
} elseif ($period === 'week') {
    $groupExpr  = "CONCAT(YEAR(STR_TO_DATE(txnDate, '%d/%m/%Y')), LPAD(WEEK(STR_TO_DATE(txnDate, '%d/%m/%Y'), 1), 2, '0'))";
    $labelExpr  = "CONCAT('Week ', WEEK(STR_TO_DATE(txnDate, '%d/%m/%Y'), 1), ' · ', YEAR(STR_TO_DATE(txnDate, '%d/%m/%Y')))";
} else {
    $groupExpr  = "DATE_FORMAT(STR_TO_DATE(txnDate, '%d/%m/%Y'), '%Y%m')";
    $labelExpr  = "DATE_FORMAT(STR_TO_DATE(txnDate, '%d/%m/%Y'), '%M %Y')";
}

$sql = "SELECT
            {$groupExpr} AS period,
            {$labelExpr} AS label,
            SUM(CAST(amount AS DECIMAL(10,2))) AS totalCoins,
            COUNT(*) AS txnCount
        FROM procointransaction
        WHERE creditDebit = '1'
          AND txnDate IS NOT NULL
          AND txnDate != ''
          AND STR_TO_DATE(txnDate, '%d/%m/%Y') IS NOT NULL
        GROUP BY {$groupExpr}
        ORDER BY {$groupExpr} DESC
        LIMIT 200";

$stmt = $db->prepare($sql);
$stmt->execute();
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($rows);
?>
