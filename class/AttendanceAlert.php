<?php
/**
 * Admin alerts to the admin + chosen staff contacts (Settings → Admin Alerts):
 *   - attendance: member's first check-in of the day (optional zone filter)
 *   - signup:     someone created an account from the login screen
 *
 * Settings live in config/feature_flags.json (edited from Admin → Settings):
 *   whatsappAttendanceAlert  bool   WhatsApp channel for ALL alert types — ON unless false (legacy key name)
 *   pushAttendanceAlert      bool   Push channel for ALL alert types — OFF unless true (legacy key name)
 *   alertAttendance          bool   attendance alert on/off — ON unless false
 *   alertSignup              bool   sign-up alert on/off — ON unless false
 *   attendanceAlertZones     str[]  zones that trigger the attendance alert (missing = all)
 *   attendanceAlertClientIds int[]  recipients (client ids). When the key is missing we fall
 *                                   back to the members matching whatsapp.json
 *                                   `attendance_alert_numbers` (the old hard-wired admin number).
 *
 * Push reaches a contact only on devices where they logged into the member app and
 * allowed notifications (push_tokens.client_id).
 */
require_once __DIR__ . '/WhatsApp.php';
require_once __DIR__ . '/PushSender.php';

class AttendanceAlert {

    const FLAGS_PATH = __DIR__ . '/../config/feature_flags.json';

    public static function flags() {
        $f = @json_decode((string)@file_get_contents(self::FLAGS_PATH), true);
        return is_array($f) ? $f : array();
    }

    public static function saveFlags(array $flags) {
        return file_put_contents(self::FLAGS_PATH, json_encode($flags, JSON_PRETTY_PRINT)) !== false;
    }

    /** Recipient client ids — saved list, or legacy whatsapp.json numbers mapped to members. */
    public static function contactIds(PDO $db) {
        $flags = self::flags();
        if (isset($flags['attendanceAlertClientIds']) && is_array($flags['attendanceAlertClientIds'])) {
            return array_values(array_unique(array_map('intval', $flags['attendanceAlertClientIds'])));
        }
        $cfg = WhatsApp::config();
        $ids = array();
        foreach ((array)($cfg['attendance_alert_numbers'] ?? array()) as $num) {
            $last10 = substr(preg_replace('/\D/', '', (string)$num), -10);
            if (strlen($last10) !== 10) continue;
            $s = $db->prepare("SELECT id FROM client WHERE mobile LIKE ? AND COALESCE(discontinue, '') <> 'true' ORDER BY id LIMIT 1");
            $s->execute(array('%' . $last10));
            $id = $s->fetchColumn();
            if ($id) $ids[] = intval($id);
        }
        return array_values(array_unique($ids));
    }

    /** Contact rows for the settings UI: id, name, mobile, pushDevices. */
    public static function contacts(PDO $db, $ids = null) {
        $ids = $ids === null ? self::contactIds($db) : $ids;
        if (empty($ids)) return array();
        $in = implode(',', array_fill(0, count($ids), '?'));
        $s = $db->prepare(
            "SELECT c.id, c.name, c.mobile,
                    (SELECT COUNT(*) FROM push_tokens t WHERE t.client_id = c.id AND t.is_active = 'yes') AS pushDevices
               FROM client c WHERE c.id IN ($in)"
        );
        $s->execute($ids);
        $byId = array();
        foreach ($s->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $r['id'] = intval($r['id']);
            $r['pushDevices'] = intval($r['pushDevices']);
            $byId[$r['id']] = $r;
        }
        $out = array();
        foreach ($ids as $id) if (isset($byId[$id])) $out[] = $byId[$id];   // keep saved order
        return $out;
    }

    const ZONES = array('red', 'yellow', 'green');

    /** Zones that trigger alerts. Missing key = all (legacy behaviour). */
    public static function zones() {
        $flags = self::flags();
        if (!isset($flags['attendanceAlertZones']) || !is_array($flags['attendanceAlertZones'])) return self::ZONES;
        return array_values(array_intersect(self::ZONES, $flags['attendanceAlertZones']));
    }

    /**
     * Member zone from their latest package — same rule as the Members page:
     * green > 5 days left, yellow 0–5, red expired, null = no package.
     */
    public static function zoneOf(PDO $db, $clientId) {
        return self::zoneInfo($db, $clientId)['zone'];
    }

    /** ['zone' => red|yellow|green|null, 'days' => days left (negative = expired) | null] */
    public static function zoneInfo(PDO $db, $clientId) {
        $s = $db->prepare("SELECT endDate FROM packagedetails WHERE clientId = ? AND discontinue != 'true' ORDER BY id DESC LIMIT 1");
        $s->execute(array(intval($clientId)));
        $end = DateTime::createFromFormat('!d/m/Y', trim((string)$s->fetchColumn()), new DateTimeZone('Asia/Calcutta'));
        if (!$end) return array('zone' => null, 'days' => null);
        $today = new DateTime('today', new DateTimeZone('Asia/Calcutta'));
        $days  = (int)$today->diff($end)->format('%r%a');
        $zone  = $days > 5 ? 'green' : ($days >= 0 ? 'yellow' : 'red');
        return array('zone' => $zone, 'days' => $days);
    }

    /** Colour dot + short status for the notification, e.g. ['🔴', 'Red zone · expired 3 days ago']. */
    private static function zoneBadge($info) {
        $d = $info['days'];
        switch ($info['zone']) {
            case 'red':
                $ago = -$d;
                return array('🔴', 'Red zone · expired ' . ($ago === 1 ? 'yesterday' : $ago . ' days ago'));
            case 'yellow':
                return array('🟡', 'Yellow zone · ' . ($d === 0 ? 'expires today' : $d . ' day' . ($d === 1 ? '' : 's') . ' left'));
            case 'green':
                return array('🟢', 'Green zone · ' . $d . ' days left');
            default:
                return array('⚪', 'No active package');
        }
    }

    /** Fire the alert. Only on the member's first attendance row of the day. */
    /** Delivery channels — shared by every admin alert type. */
    public static function channels() {
        $f = self::flags();
        return array(
            'wa'   => !(isset($f['whatsappAttendanceAlert']) && !$f['whatsappAttendanceAlert']),   // legacy key, ON by default
            'push' => !empty($f['pushAttendanceAlert']),                                          // legacy key, OFF by default
        );
    }

    /** Alert types — each can be switched off on its own (ON by default). */
    const TYPE_KEYS = array('attendance' => 'alertAttendance', 'signup' => 'alertSignup');

    public static function typeOn($type) {
        $f = self::flags();
        $k = self::TYPE_KEYS[$type];
        return !(isset($f[$k]) && !$f[$k]);
    }

    public static function send(PDO $db, $clientId) {
        try {
            if (!self::typeOn('attendance')) return;
            $ch = self::channels();
            if (!$ch['wa'] && !$ch['push']) return;

            date_default_timezone_set('Asia/Calcutta');
            $s = $db->prepare("SELECT COUNT(*) FROM attendance WHERE cid = ? AND date = ?");
            $s->execute(array(intval($clientId), date('d/m/Y')));
            if (intval($s->fetchColumn()) !== 1) return;

            // Zone filter — all three selected = every member (incl. no package)
            $info  = self::zoneInfo($db, $clientId);
            $zones = self::zones();
            if (count($zones) < count(self::ZONES)) {
                if (!in_array($info['zone'], $zones, true)) return;
            }

            $s = $db->prepare("SELECT name FROM client WHERE id = ? LIMIT 1");
            $s->execute(array(intval($clientId)));
            $member = $s->fetchColumn();
            if (!$member) return;

            self::deliver($db, $ch, self::attendanceMessage(intval($clientId), $member, $info,
                'att-' . intval($clientId) . '-' . date('Ymd')));
        } catch (Throwable $e) {
            error_log('AttendanceAlert error: ' . $e->getMessage());
        }
    }

    /** Someone created an account from the login screen. $via = 'Mobile OTP' | 'Google'. */
    public static function signup(PDO $db, $clientId, $via) {
        try {
            if (!self::typeOn('signup')) return;
            $ch = self::channels();
            if (!$ch['wa'] && !$ch['push']) return;
            date_default_timezone_set('Asia/Calcutta');
            $s = $db->prepare("SELECT name, mobile FROM client WHERE id = ? LIMIT 1");
            $s->execute(array(intval($clientId)));
            $c = $s->fetch(PDO::FETCH_ASSOC);
            if (!$c) return;
            self::deliver($db, $ch, self::signupMessage(intval($clientId), $c['name'], $c['mobile'], $via, 'signup-' . intval($clientId)));
        } catch (Throwable $e) {
            error_log('AttendanceAlert signup error: ' . $e->getMessage());
        }
    }

    /**
     * Admin "Test" — sends a sample of one alert type to every contact over the channels
     * that are ON. Ignores the type on/off switch and the attendance filters.
     * @return array ['contacts' => n, 'whatsapp' => [on, sent, failed], 'push' => [on, devices, sent, failed]]
     */
    public static function sendTest(PDO $db, $type = 'attendance') {
        $ch = self::channels();
        date_default_timezone_set('Asia/Calcutta');
        if ($type === 'signup') {
            return self::deliver($db, $ch, self::signupMessage(0, 'Test Member', '9876543210', 'Mobile OTP', 'signup-test-' . time()));
        }
        // Sample shows a random zone colour so the admin can see how each looks
        $samples = array(
            array('zone' => 'red',    'days' => -3),
            array('zone' => 'yellow', 'days' => 2),
            array('zone' => 'green',  'days' => 18),
        );
        return self::deliver($db, $ch, self::attendanceMessage(0, 'Test Member', $samples[array_rand($samples)], 'att-test-' . time()));
    }

    // ── Messages ─────────────────────────────────────────────────────────
    // 'wa' is a list of [template, params] tried in order until one is accepted;
    // '{contact}' in a param is replaced with the recipient's name.

    private static function attendanceMessage($clientId, $member, $zoneInfo, $nid) {
        list($dot, $status) = self::zoneBadge($zoneInfo);
        $time = date('h:i A');
        $day  = date('d/m/Y');
        return array(
            'type'     => 'attendance_alert',
            'clientId' => $clientId,
            // Template text is fixed — the zone dot rides on the name
            'wa'       => array(array(WhatsApp::TPL_ATTENDANCE, array($dot . ' ' . $member, $time, $day))),
            'push'     => array(
                'title' => $dot . ' ' . $member . ' checked in',
                'body'  => $status . "\n" . 'Attendance marked at ' . $time . ' · ' . $day,
                'nid'   => $nid,
                // Tap → that member's profile (admin/trainer page; test alert → members list)
                'link'  => $clientId > 0 ? 'members/' . intval($clientId) : 'members',
            ),
        );
    }

    private static function signupMessage($clientId, $name, $mobile, $via, $nid) {
        $when = date('d/m/Y h:i A');
        return array(
            'type'     => 'signup_alert',
            'clientId' => $clientId,
            'wa'       => array(
                array(WhatsApp::TPL_SIGNUP_ALERT, array($name, $mobile, $via, $when)),
                // Fallback while the dedicated template is pending Meta review (params can't contain newlines)
                array(WhatsApp::TPL_ANNOUNCEMENT, array('{contact}',
                    "Staff alert: new account on the ProGym app. Name: $name, Mobile: $mobile, via $via, on $when.")),
            ),
            'push'     => array(
                'title' => '🆕 New sign-up: ' . $name,
                'body'  => '+91 ' . $mobile . ' · via ' . $via . "\n" . $when,
                'nid'   => $nid,
                'link'  => $clientId > 0 ? 'members/' . intval($clientId) : 'members',
            ),
        );
    }

    /** Send one message to all contacts over the given channels; returns per-channel counts. */
    private static function deliver(PDO $db, $ch, $msg) {
        $contacts = self::contacts($db);
        $stats = array(
            'contacts' => count($contacts),
            'whatsapp' => array('on' => $ch['wa'],   'sent' => 0, 'failed' => 0),
            'push'     => array('on' => $ch['push'], 'devices' => 0, 'sent' => 0, 'failed' => 0),
        );
        if (empty($contacts)) return $stats;

        if ($ch['wa']) {
            foreach ($contacts as $c) {
                if (empty($c['mobile'])) { $stats['whatsapp']['failed']++; continue; }
                $ok = false;
                foreach ($msg['wa'] as $tpl) {
                    $params = array_map(function ($p) use ($c) { return str_replace('{contact}', $c['name'], $p); }, $tpl[1]);
                    $ok = WhatsApp::sendTemplate($db, $msg['type'], $msg['clientId'], $c['mobile'], $tpl[0], $params);
                    if ($ok) break;
                }
                $stats['whatsapp'][$ok ? 'sent' : 'failed']++;
            }
        }

        if ($ch['push']) {
            $ids = array_map(function ($c) { return $c['id']; }, $contacts);
            $in  = implode(',', array_fill(0, count($ids), '?'));
            $d   = $db->prepare("SELECT id, token FROM push_tokens WHERE is_active = 'yes' AND client_id IN ($in)");
            $d->execute($ids);
            $devices = $d->fetchAll(PDO::FETCH_ASSOC);
            $stats['push']['devices'] = count($devices);
            if ($devices) {
                $r = PushSender::sendToTokens($db, $devices, $msg['push']);
                $stats['push']['sent']   = $r['sent'];
                $stats['push']['failed'] = $r['failed'];
            }
        }
        return $stats;
    }
}
