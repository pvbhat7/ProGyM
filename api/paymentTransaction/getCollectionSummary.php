<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    $type = isset($_GET['type']) ? $_GET['type'] : 'monthly';

    $result = [];

    if ($type === 'monthly') {
        for ($i = 0; $i < 12; $i++) {
            $ts = strtotime("-$i month");
            $month = date("m", $ts);
            $year  = date("Y", $ts);
            $filter = "$month/$year";
            $stmt = $db->prepare("SELECT COALESCE(SUM(feesPaid), 0) as collection FROM paymenttransaction WHERE paymentDate LIKE ?");
            $stmt->execute(["%/$filter"]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $monthNames = ['01'=>'Jan','02'=>'Feb','03'=>'Mar','04'=>'Apr','05'=>'May','06'=>'Jun',
                           '07'=>'Jul','08'=>'Aug','09'=>'Sep','10'=>'Oct','11'=>'Nov','12'=>'Dec'];
            $result[] = [
                'label'  => $monthNames[$month] . ' ' . $year,
                'amount' => (float)$row['collection']
            ];
        }
    } elseif ($type === 'yearly') {
        for ($i = 0; $i < 5; $i++) {
            $year = date("Y", strtotime("-$i year"));
            $stmt = $db->prepare("SELECT COALESCE(SUM(feesPaid), 0) as collection FROM paymenttransaction WHERE paymentDate LIKE ?");
            $stmt->execute(["%/$year"]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $result[] = [
                'label'  => $year,
                'amount' => (float)$row['collection']
            ];
        }
    } elseif ($type === 'weekly') {
        for ($i = 0; $i < 8; $i++) {
            $endTs   = strtotime("-" . ($i * 7) . " days");
            $startTs = strtotime("-" . ($i * 7 + 6) . " days");
            $startDate = date("Y-m-d", $startTs);
            $endDate   = date("Y-m-d", $endTs);
            $stmt = $db->prepare(
                "SELECT COALESCE(SUM(feesPaid), 0) as collection FROM paymenttransaction
                 WHERE STR_TO_DATE(paymentDate, '%d/%m/%Y') BETWEEN ? AND ?"
            );
            $stmt->execute([$startDate, $endDate]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $label = date("d M", $startTs) . ' – ' . date("d M", $endTs);
            $result[] = [
                'label'  => $label,
                'amount' => (float)$row['collection']
            ];
        }
    }

    echo json_encode($result);
?>
