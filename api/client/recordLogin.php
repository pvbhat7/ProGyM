<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

    include_once '../../config/database.php';
    include_once '../../class/CoinEarningRules.php';
    include_once '../../class/UserNotifications.php';

    $database = new Database();
    $db = $database->getConnection();

    $data     = json_decode(file_get_contents("php://input"));
    $clientId = intval($data->clientId ?? 0);

    if ($clientId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid clientId']);
        exit;
    }

    date_default_timezone_set('Asia/Calcutta');
    $today = date('d/m/Y');
    $now   = date('d-m-Y H:i:s');

    // Fetch client's current last_login
    $stmt = $db->prepare("SELECT last_login FROM client WHERE id = ? LIMIT 1");
    $stmt->execute([$clientId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Client not found']);
        exit;
    }

    // Always update last_login so we can do the check next time
    $db->prepare("UPDATE client SET last_login = ? WHERE id = ?")->execute([$today, $clientId]);

    // Already logged in today — no coin
    if ($row['last_login'] === $today) {
        echo json_encode(['status' => 'already_credited']);
        exit;
    }

    // Fetch earning rule for daily_login
    $rule            = new CoinEarningRules($db);
    $rule->eventType = 'daily_login';
    $ruleStmt        = $rule->getByEventType();
    $ruleRow         = $ruleStmt->fetch(PDO::FETCH_ASSOC);

    if (!$ruleRow) {
        // Rule is disabled or missing — last_login already updated above, no coin
        echo json_encode(['status' => 'rule_inactive']);
        exit;
    }

    $coinAmount = intval($ruleRow['coinAmount']);
    $txnId      = 'LOGIN-' . $clientId . '-' . date('YmdHis');

    // Credit procointransaction
    $db->prepare(
        "INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId)
         VALUES (?, ?, ?, '1', ?, ?)"
    )->execute([$txnId, 'Daily Login Bonus', $coinAmount, $today, $clientId]);

    // Create user notification
    $notif           = new UserNotifications($db);
    $notif->clientId = $clientId;
    $notif->type     = 'coin_credit';
    $notif->title    = 'Daily Login Bonus';
    $notif->message  = 'You earned ' . $coinAmount . ' ProCoin for logging in today!';
    $notif->amount   = $coinAmount;
    $notif->createdAt = $now;
    $notif->create();

    echo json_encode(['status' => 'credited', 'coins' => $coinAmount]);
?>
