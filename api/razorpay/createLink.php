<?php
    // POST { clientId, purpose: 'renew'|'balance', packageId?, packageDetailsId?, notify?: bool }
    // Admin-generated Razorpay payment link. Paid links are recorded by webhook.php.
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/Razorpay.php';

    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"));
    $rowId = 0;

    try {
        $q = Razorpay::quote($db,
            intval($data->clientId ?? 0),
            (string)($data->purpose ?? ''),
            intval($data->packageId ?? 0),
            intval($data->packageDetailsId ?? 0)
        );
        $client = Razorpay::getClient($db, $q['clientId']);
        $notify = !empty($data->notify);
        $cfg    = Razorpay::config();
        $days   = !empty($cfg['payment_link_expiry_days']) ? intval($cfg['payment_link_expiry_days']) : 7;

        $customer = array('name' => (string)$client['name']);
        $mobile = WhatsApp::normalizeMobile($client['mobile']);
        if ($mobile) $customer['contact'] = '+' . $mobile;
        if (filter_var($client['email'], FILTER_VALIDATE_EMAIL)) $customer['email'] = $client['email'];

        $rowId = Razorpay::insertRow($db, 'link', $q, 'admin');
        $body = array(
            'amount'          => intval(round($q['amount'] * 100)),
            'currency'        => 'INR',
            'description'     => $q['description'],
            'reference_id'    => 'pglink_' . $rowId,
            'customer'        => $customer,
            'notify'          => array('sms' => $notify, 'email' => $notify),
            'reminder_enable' => $notify,
            'expire_by'       => time() + $days * 86400,
            'notes'           => array('clientId' => (string)$q['clientId'], 'purpose' => $q['purpose'], 'rowId' => (string)$rowId),
        );
        if (!empty($cfg['payment_link_callback_url'])) {
            $body['callback_url']    = $cfg['payment_link_callback_url'];
            $body['callback_method'] = 'get';
        }
        $link = Razorpay::api('POST', 'payment_links', $body);
        $db->prepare("UPDATE razorpay_payments SET rzpLinkId = ?, linkUrl = ? WHERE id = ?")
           ->execute(array($link['id'], $link['short_url'], $rowId));

        // Auto-send via our WhatsApp Cloud API (default on). Failure doesn't fail the link —
        // the admin still gets the URL and the manual share button.
        $waSent = null; $waError = null;
        if (!isset($data->whatsapp) || $data->whatsapp) {
            $waSent  = WhatsApp::paymentLink($db, $q['clientId'], $client['mobile'], $client['name'],
                                             $q['amount'], $q['description'], $link['short_url'], $days);
            $waError = $waSent ? null : WhatsApp::$lastError;
        }

        echo json_encode(array(
            'ok'          => true,
            'whatsappSent'  => $waSent,
            'whatsappError' => $waError,
            'url'         => $link['short_url'],
            'amount'      => $q['amount'],
            'description' => $q['description'],
            'mobile'      => $mobile,
            'name'        => $client['name'],
            'expiresDays' => $days,
        ));
    } catch (Throwable $e) {
        if ($rowId) Razorpay::markFailed($db, $rowId, $e->getMessage());
        http_response_code(400);
        echo json_encode(array('ok' => false, 'error' => $e->getMessage()));
    }
?>
