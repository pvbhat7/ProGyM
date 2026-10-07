<?php
/**
 * Razorpay online payments for membership renewal and pending package balance.
 *
 * Config + secrets live outside public_html in secure_keys/razorpay.json:
 *   enabled (bool), mode ('test'|'live'),
 *   test/live: { key_id, key_secret, webhook_secret },
 *   payment_link_callback_url, payment_link_expiry_days
 *
 * Flow:
 *   quote()     — server decides the amount (never trusts the browser)
 *   createOrder / createLink endpoints insert a `razorpay_payments` row
 *   fulfil()    — called by verify.php (checkout handler) and webhook.php;
 *                 the created→processing status flip makes it run once per payment.
 *   sendReceipts() — email + WhatsApp, run after the HTTP response is flushed.
 */
include_once __DIR__ . '/paymenttransaction.php';
include_once __DIR__ . '/procointransaction.php';
include_once __DIR__ . '/CoinCreditEvents.php';
include_once __DIR__ . '/CoinEarningRules.php';
include_once __DIR__ . '/UserNotifications.php';
include_once __DIR__ . '/PaymentEmail.php';
include_once __DIR__ . '/WhatsApp.php';

class Razorpay {

    const CONFIG_PATH = '/home/u636480992/domains/tavrostechinfo.com/secure_keys/razorpay.json';
    const API_BASE    = 'https://api.razorpay.com/v1/';

    private static $cfg = null;

    public static function config() {
        if (self::$cfg === null) {
            $cfg = is_readable(self::CONFIG_PATH) ? json_decode(file_get_contents(self::CONFIG_PATH), true) : null;
            self::$cfg = is_array($cfg) ? $cfg : array();
        }
        return self::$cfg;
    }

    public static function mode() {
        $cfg = self::config();
        return (isset($cfg['mode']) && $cfg['mode'] === 'live') ? 'live' : 'test';
    }

    /** paymenttransaction.paymentMode — test payments are labelled so they're never mistaken for real money. */
    public static function paymentModeLabel($mode) {
        return $mode === 'live' ? 'Razorpay' : 'Razorpay (Test)';
    }

    public static function isConfigured($mode) {
        $cfg = self::config();
        return !empty($cfg[$mode]['key_id']) && !empty($cfg[$mode]['key_secret']);
    }

    /** Switch test/live (admin Settings). Rewrites the secrets file in place. */
    public static function setMode($mode) {
        if ($mode !== 'test' && $mode !== 'live') throw new Exception('Invalid mode');
        if (!self::isConfigured($mode)) throw new Exception(ucfirst($mode) . ' keys are not configured');
        $cfg = self::config();
        $cfg['mode'] = $mode;
        if (file_put_contents(self::CONFIG_PATH, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX) === false) {
            throw new Exception('Could not save payment settings');
        }
        self::$cfg = $cfg;
    }

    /** Admin "Go live" toggle (config/feature_flags.json) — members see Pay/Renew only when ON. Missing = OFF. */
    public static function memberPaymentsOn() {
        $flags = @json_decode((string)@file_get_contents(__DIR__ . '/../config/feature_flags.json'), true);
        return is_array($flags) && !empty($flags['razorpayMemberPayments']);
    }

    /** Same check as api/adminuser/validateSecurityPin.php. */
    public static function adminPinValid($pin) {
        $file = __DIR__ . '/../config/security_pin.txt';
        $stored = file_exists($file) ? trim(file_get_contents($file)) : '1234';
        return is_string($pin) && $pin !== '' && hash_equals($stored, $pin);
    }

    /**
     * Key block { key_id, key_secret, webhook_secret } for $mode (default: current mode).
     * Existing orders/links pass their own row mode so a later test↔live switch doesn't break them.
     */
    public static function keys($mode = null) {
        $cfg  = self::config();
        $mode = $mode ?: self::mode();
        $keys = isset($cfg[$mode]) ? $cfg[$mode] : array();
        if (empty($cfg['enabled']) || empty($keys['key_id']) || empty($keys['key_secret'])) {
            throw new Exception('Online payments are not enabled');
        }
        return $keys;
    }

    /** Call the Razorpay REST API. Returns the decoded body; throws on non-2xx. */
    public static function api($method, $path, $body = null, $mode = null) {
        $keys = self::keys($mode);
        $ch = curl_init(self::API_BASE . $path);
        $opts = array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_USERPWD        => $keys['key_id'] . ':' . $keys['key_secret'],
            CURLOPT_HTTPHEADER     => array('Content-Type: application/json'),
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 15,
        );
        if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body);
        curl_setopt_array($ch, $opts);
        $raw  = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        $res = json_decode((string)$raw, true);
        if ($http >= 200 && $http < 300 && is_array($res)) return $res;
        $err = $cerr ?: (isset($res['error']['description']) ? $res['error']['description'] : "HTTP {$http}");
        error_log("Razorpay {$method} {$path} failed: {$err}");
        throw new Exception('Razorpay: ' . $err);
    }

    public static function checkoutSignatureValid($orderId, $paymentId, $signature, $mode) {
        $keys = self::keys($mode);
        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $keys['key_secret']);
        return is_string($signature) && hash_equals($expected, $signature);
    }

    /** Webhooks don't say which mode sent them, so accept either mode's secret. */
    public static function webhookSignatureValid($rawBody, $signature) {
        $cfg = self::config();
        foreach (array('live', 'test') as $mode) {
            $secret = isset($cfg[$mode]['webhook_secret']) ? $cfg[$mode]['webhook_secret'] : '';
            if ($secret !== '' && is_string($signature) && hash_equals(hash_hmac('sha256', $rawBody, $secret), $signature)) {
                return true;
            }
        }
        return false;
    }

    public static function getClient($db, $clientId) {
        $s = $db->prepare("SELECT id, name, mobile, email, gender FROM client WHERE id = ? AND IFNULL(discontinue, '') <> 'true' LIMIT 1");
        $s->execute(array(intval($clientId)));
        return $s->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Packages the client may renew into (same gender rule as the admin renew form). */
    public static function renewOptions($db, $clientId) {
        $client = self::getClient($db, $clientId);
        if (!$client) throw new Exception('Member not found');
        $s = $db->prepare("SELECT id, days, fees, gender, description FROM packages WHERE LOWER(gender) = LOWER(?) ORDER BY days");
        $s->execute(array((string)$client['gender']));
        $opts = array();
        foreach ($s->fetchAll(PDO::FETCH_ASSOC) as $p) {
            if (floatval($p['fees']) < 1 || intval($p['days']) <= 0) continue;
            list($start, $end) = self::renewalDates($db, $clientId, intval($p['days']));
            $opts[] = array(
                'packageId'   => intval($p['id']),
                'days'        => intval($p['days']),
                'fees'        => floatval($p['fees']),
                'description' => $p['description'],
                'startDate'   => $start,
                'endDate'     => $end,
            );
        }
        return $opts;
    }

    /**
     * Renewal period: starts the day after the member's latest package ends,
     * or today if that has already passed. End = start + days (same as the admin renew form).
     */
    public static function renewalDates($db, $clientId, $days) {
        date_default_timezone_set('Asia/Calcutta');
        $today = new DateTime('today');
        $start = clone $today;

        $s = $db->prepare("SELECT endDate FROM packagedetails WHERE clientId = ? AND IFNULL(discontinue, '') <> 'true'");
        $s->execute(array(intval($clientId)));
        foreach ($s->fetchAll(PDO::FETCH_COLUMN) as $endStr) {
            $end = DateTime::createFromFormat('!d/m/Y', (string)$endStr);
            if (!$end) continue;
            $end->modify('+1 day');
            if ($end > $start) $start = $end;
        }
        $end = clone $start;
        $end->modify('+' . intval($days) . ' days');
        return array($start->format('d/m/Y'), $end->format('d/m/Y'));
    }

    /** Amount still owed on a packagedetails row (fees minus cash + ProCoins paid). */
    public static function balanceFor($db, $packageDetailsId) {
        $s = $db->prepare("SELECT fees FROM packagedetails WHERE id = ?");
        $s->execute(array(intval($packageDetailsId)));
        $fees = floatval($s->fetchColumn());
        $s = $db->prepare("SELECT COALESCE(SUM(feesPaid + IFNULL(proCoinsUsed, 0)), 0) FROM paymenttransaction
                           WHERE packageDetailsId = ? AND discontinue = 'false'");
        $s->execute(array(intval($packageDetailsId)));
        return round(max(0, $fees - floatval($s->fetchColumn())), 2);
    }

    /**
     * Server-side price for a payment request. Throws with a user-facing message if invalid.
     * Returns { purpose, clientId, packageId, packageDetailsId, amount, description, startDate?, endDate? }
     */
    public static function quote($db, $clientId, $purpose, $packageId, $packageDetailsId) {
        $client = self::getClient($db, $clientId);
        if (!$client) throw new Exception('Member not found');

        if ($purpose === 'balance') {
            $s = $db->prepare(
                "SELECT pd.id, pd.packageId, COALESCE(NULLIF(p.description,''), pd.description, 'Membership') AS name
                 FROM packagedetails pd LEFT JOIN packages p ON p.id = pd.packageId
                 WHERE pd.id = ? AND pd.clientId = ? AND IFNULL(pd.discontinue, '') <> 'true' LIMIT 1"
            );
            $s->execute(array(intval($packageDetailsId), intval($clientId)));
            $pd = $s->fetch(PDO::FETCH_ASSOC);
            if (!$pd) throw new Exception('Package not found');
            $amount = self::balanceFor($db, $pd['id']);
            if ($amount < 1) throw new Exception('Nothing pending on this package');
            return array(
                'purpose'          => 'balance',
                'clientId'         => intval($clientId),
                'packageId'        => intval($pd['packageId']),
                'packageDetailsId' => intval($pd['id']),
                'amount'           => $amount,
                'description'      => 'Balance - ' . $pd['name'],
            );
        }

        if ($purpose === 'renew') {
            foreach (self::renewOptions($db, $clientId) as $o) {
                if ($o['packageId'] !== intval($packageId)) continue;
                return array(
                    'purpose'          => 'renew',
                    'clientId'         => intval($clientId),
                    'packageId'        => $o['packageId'],
                    'packageDetailsId' => null,
                    'amount'           => round($o['fees'], 2),
                    'description'      => 'Renewal - ' . ($o['description'] ?: ($o['days'] . ' days')),
                    'startDate'        => $o['startDate'],
                    'endDate'          => $o['endDate'],
                );
            }
            throw new Exception('Package not available for this member');
        }

        throw new Exception('Invalid payment type');
    }

    /** Insert a razorpay_payments row for a quote; returns its id. */
    public static function insertRow($db, $kind, array $q, $createdBy) {
        date_default_timezone_set('Asia/Calcutta');
        $s = $db->prepare(
            "INSERT INTO razorpay_payments (kind, purpose, clientId, packageId, packageDetailsId, amount, description, mode, status, createdBy, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)"
        );
        $s->execute(array($kind, $q['purpose'], $q['clientId'], $q['packageId'], $q['packageDetailsId'],
                          $q['amount'], $q['description'], self::mode(), $createdBy, date('Y-m-d H:i:s')));
        return intval($db->lastInsertId());
    }

    public static function findRow($db, $column, $value) {
        if (!in_array($column, array('id', 'rzpOrderId', 'rzpLinkId'), true)) return null;
        $s = $db->prepare("SELECT * FROM razorpay_payments WHERE {$column} = ? LIMIT 1");
        $s->execute(array($value));
        return $s->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public static function markFailed($db, $rowId, $error) {
        $s = $db->prepare("UPDATE razorpay_payments SET status = 'failed', error = ? WHERE id = ?");
        $s->execute(array(mb_substr((string)$error, 0, 255), intval($rowId)));
    }

    /**
     * Record a successful Razorpay payment against our DB, exactly once.
     * $payment is the Razorpay payment entity (id, amount in paise, status, method).
     * Returns the (re-read) razorpay_payments row; ['_fresh'] = true when this call recorded it.
     */
    public static function fulfil($db, array $row, array $payment) {
        if (!in_array($payment['status'] ?? '', array('captured', 'authorized'), true)) {
            throw new Exception('Payment not completed');
        }
        if (intval($payment['amount'] ?? 0) !== intval(round(floatval($row['amount']) * 100))) {
            self::markFailed($db, $row['id'], 'Amount mismatch: paid ' . ($payment['amount'] ?? '?') . ' paise');
            throw new Exception('Payment amount mismatch');
        }

        // Idempotency lock — only one of verify.php / webhook.php gets past this.
        $lock = $db->prepare("UPDATE razorpay_payments SET status = 'processing', rzpPaymentId = ?, paymentMethod = ?
                              WHERE id = ? AND status = 'created'");
        $lock->execute(array($payment['id'], $payment['method'] ?? null, $row['id']));
        if ($lock->rowCount() !== 1) return self::findRow($db, 'id', $row['id']);

        try {
            if (($payment['status'] ?? '') === 'authorized') {
                try {
                    self::api('POST', 'payments/' . rawurlencode($payment['id']) . '/capture',
                              array('amount' => intval($payment['amount']), 'currency' => 'INR'), $row['mode']);
                } catch (Exception $e) {
                    // Auto-capture may have beaten us to it — only fail if it's really not captured.
                    $latest = self::api('GET', 'payments/' . rawurlencode($payment['id']), null, $row['mode']);
                    if (($latest['status'] ?? '') !== 'captured') throw $e;
                }
            }

            date_default_timezone_set('Asia/Calcutta');
            $today  = date('d/m/Y');
            $now    = date('d-m-Y H:i:s');
            $amount = floatval($row['amount']);
            $client = self::getClient($db, $row['clientId']);
            $clientId = intval($row['clientId']);

            $db->beginTransaction();

            $pdId = intval($row['packageDetailsId']);
            $startsToday = false;
            if ($row['purpose'] === 'renew') {
                $p = $db->prepare("SELECT days, description FROM packages WHERE id = ?");
                $p->execute(array(intval($row['packageId'])));
                $pkg = $p->fetch(PDO::FETCH_ASSOC);
                if (!$pkg) throw new Exception('Package no longer exists');
                // Dates are fixed at payment time, so a link paid days later still starts correctly.
                list($start, $end) = self::renewalDates($db, $clientId, intval($pkg['days']));
                $ins = $db->prepare(
                    "INSERT INTO packagedetails (packageId, clientId, startDate, endDate, fees, amountPaid, paymentDate, status, description, discontinue)
                     VALUES (?, ?, ?, ?, ?, 0, ?, 'not paid', ?, 'false')"
                );
                $ins->execute(array(intval($row['packageId']), $clientId, $start, $end, $amount, $today, (string)$pkg['description']));
                $pdId = intval($db->lastInsertId());
                $startsToday = ($start === $today);
            }

            $txn = new paymenttransaction($db);
            $txn->packageDetailsId = $pdId;
            $txn->feesPaid         = $amount;
            $txn->paymentDate      = $today;
            $txn->isApproved       = 'YES';
            $txn->clientGender     = $client ? $client['gender'] : '';
            $txn->clientId         = $clientId;
            $txn->paymentMode      = self::paymentModeLabel($row['mode']);
            $txn->discontinue      = 'false';
            $txn->proCoinsUsed     = 0;
            $txnId = intval($txn->create());

            self::syncPackageStatus($db, $clientId, $pdId, $today, $now);

            if ($startsToday) {
                $db->prepare("UPDATE client SET profileActiveFlag = 'enable' WHERE id = ?")->execute(array($clientId));
            }

            $done = $db->prepare("UPDATE razorpay_payments SET status = 'paid', packageDetailsId = ?, paymentTransactionId = ?, paidAt = ?, error = NULL WHERE id = ?");
            $done->execute(array($pdId, $txnId, date('Y-m-d H:i:s'), $row['id']));

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log('Razorpay fulfil row ' . $row['id'] . ' failed: ' . $e->getMessage());
            // Money was taken but not recorded — leave a visible trail for the admin.
            self::markFailed($db, $row['id'], 'Paid (' . $payment['id'] . ') but not recorded: ' . $e->getMessage());
            throw $e;
        }

        $fresh = self::findRow($db, 'id', $row['id']);
        $fresh['_fresh'] = true;
        return $fresh;
    }

    /**
     * Same post-payment bookkeeping as api/paymentTransaction/create.php:
     * derive amountPaid/status from the txn total, award the one-time full-payment bonus.
     */
    private static function syncPackageStatus($db, $clientId, $pdId, $today, $now) {
        $s = $db->prepare("SELECT fees FROM packagedetails WHERE id = ?");
        $s->execute(array($pdId));
        $fees = floatval($s->fetchColumn());
        $s = $db->prepare("SELECT COALESCE(SUM(feesPaid + IFNULL(proCoinsUsed, 0)), 0) FROM paymenttransaction
                           WHERE packageDetailsId = ? AND discontinue = 'false'");
        $s->execute(array($pdId));
        $paid = floatval($s->fetchColumn());

        $status = $fees > 0 ? ($paid >= $fees ? 'fully-paid' : ($paid > 0 ? 'partial-paid' : 'not paid'))
                            : ($paid > 0 ? 'fully-paid' : 'not paid');
        $db->prepare("UPDATE packagedetails SET amountPaid = ?, status = ? WHERE id = ?")->execute(array($paid, $status, $pdId));

        if (!($fees > 0 && $paid >= $fees)) return;

        $events = new CoinCreditEvents($db);
        $events->clientId    = $clientId;
        $events->eventType   = 'full_payment';
        $events->referenceId = $pdId;
        if ($events->existsForReference()) return;

        $rules = new CoinEarningRules($db);
        $rules->eventType = 'full_payment';
        $rule = $rules->getByEventType()->fetch(PDO::FETCH_ASSOC);
        if (!$rule) return;
        $coinAmt = intval($rule['coinAmount']);

        $credit = new procointransaction($db);
        $credit->txnId       = 'FULLPAY' . $pdId;
        $credit->des         = 'Full Payment Bonus';
        $credit->amount      = $coinAmt;
        $credit->creditDebit = '1';
        $credit->txnDate     = $today;
        $credit->clientId    = $clientId;
        $credit->createProcointransactionFromApp();

        $events->coinAmount = $coinAmt;
        $events->createdAt  = $now;
        $events->create();

        $notif = new UserNotifications($db);
        $notif->clientId  = $clientId;
        $notif->type      = 'coin_credit';
        $notif->title     = 'Full Payment Bonus!';
        $notif->message   = 'You earned ' . $coinAmt . ' ProCoins for completing your package payment!';
        $notif->amount    = $coinAmt;
        $notif->createdAt = $now;
        $notif->create();
    }

    /** Email + WhatsApp receipt. Never throws — call after the HTTP response is flushed. */
    public static function sendReceipts($db, array $row) {
        try {
            PaymentEmail::send($db, intval($row['clientId']), intval($row['packageDetailsId']),
                               floatval($row['amount']), date('d/m/Y', strtotime($row['paidAt'])));
        } catch (Throwable $e) {
            error_log('Razorpay receipt email failed: ' . $e->getMessage());
        }
        WhatsApp::paymentReceiptForTxn($db, intval($row['paymentTransactionId']));
    }
}
