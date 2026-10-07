<?php
    // GET ?clientId= — packages the member can renew into, with server-computed dates,
    // plus the pending balance on each of their unpaid packages.
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");

    include_once '../../config/database.php';
    include_once '../../class/Razorpay.php';

    $database = new Database();
    $db = $database->getConnection();

    $clientId = isset($_GET['clientId']) ? intval($_GET['clientId']) : 0;

    try {
        $renew = Razorpay::renewOptions($db, $clientId);

        $balances = array();
        $s = $db->prepare(
            "SELECT pd.id, pd.startDate, pd.endDate, COALESCE(NULLIF(p.description,''), pd.description, 'Membership') AS name
             FROM packagedetails pd LEFT JOIN packages p ON p.id = pd.packageId
             WHERE pd.clientId = ? AND IFNULL(pd.discontinue, '') <> 'true' ORDER BY pd.id DESC"
        );
        $s->execute(array($clientId));
        foreach ($s->fetchAll(PDO::FETCH_ASSOC) as $pd) {
            $due = Razorpay::balanceFor($db, $pd['id']);
            if ($due >= 1) {
                $balances[] = array('packageDetailsId' => intval($pd['id']), 'name' => $pd['name'],
                                    'startDate' => $pd['startDate'], 'endDate' => $pd['endDate'], 'amount' => $due);
            }
        }
        try { Razorpay::keys(); $enabled = true; } catch (Throwable $e) { $enabled = false; }
        echo json_encode(array('ok' => true, 'enabled' => $enabled, 'memberVisible' => $enabled && Razorpay::memberPaymentsOn(),
                               'renew' => $renew, 'balances' => $balances));
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
    }
?>
