<?php
/**
 * "Member checked in" alert to admin + chosen staff contacts.
 *
 * Settings live in config/feature_flags.json (edited from Admin → Settings):
 *   whatsappAttendanceAlert  bool   WhatsApp channel — ON unless explicitly false (legacy default)
 *   pushAttendanceAlert      bool   Firebase push channel — OFF unless explicitly true
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
    public static function send(PDO $db, $clientId) {
        try {
            $flags    = self::flags();
            $useWa    = !(isset($flags['whatsappAttendanceAlert']) && !$flags['whatsappAttendanceAlert']);
            $usePush  = !empty($flags['pushAttendanceAlert']);
            if (!$useWa && !$usePush) return;

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

            self::deliver($db, intval($clientId), $member, $info, $useWa, $usePush, 'att-' . intval($clientId) . '-' . date('Ymd'));
        } catch (Throwable $e) {
            error_log('AttendanceAlert error: ' . $e->getMessage());
        }
    }

    /**
     * Admin "Test Notification" — sends a sample alert to every contact over the channels
     * that are ON. Skips the first-check-in and zone filters.
     * @return array ['contacts' => n, 'whatsapp' => [on, sent, failed], 'push' => [on, devices, sent, failed]]
     */
    public static function sendTest(PDO $db) {
        $flags   = self::flags();
        $useWa   = !(isset($flags['whatsappAttendanceAlert']) && !$flags['whatsappAttendanceAlert']);
        $usePush = !empty($flags['pushAttendanceAlert']);
        date_default_timezone_set('Asia/Calcutta');
        // Sample shows a random zone colour so the admin can see how each looks
        $samples = array(
            array('zone' => 'red',    'days' => -3),
            array('zone' => 'yellow', 'days' => 2),
            array('zone' => 'green',  'days' => 18),
        );
        $info = $samples[array_rand($samples)];
        return self::deliver($db, 0, 'Test Member', $info, $useWa, $usePush, 'att-test-' . time());
    }

    /** Send one alert to all contacts; returns per-channel counts. */
    private static function deliver(PDO $db, $clientId, $member, $zoneInfo, $useWa, $usePush, $nid) {
        list($dot, $status) = self::zoneBadge($zoneInfo);
        $contacts = self::contacts($db);
        $stats = array(
            'contacts' => count($contacts),
            'whatsapp' => array('on' => $useWa,   'sent' => 0, 'failed' => 0),
            'push'     => array('on' => $usePush, 'devices' => 0, 'sent' => 0, 'failed' => 0),
        );
        if (empty($contacts)) return $stats;
        $time = date('h:i A');
        $day  = date('d/m/Y');

        if ($useWa) {
            foreach ($contacts as $c) {
                if (empty($c['mobile'])) { $stats['whatsapp']['failed']++; continue; }
                $ok = WhatsApp::sendTemplate($db, 'attendance_alert', $clientId, $c['mobile'], WhatsApp::TPL_ATTENDANCE,
                    array($dot . ' ' . $member, $time, $day));   // template text is fixed — the dot rides on the name
                $stats['whatsapp'][$ok ? 'sent' : 'failed']++;
            }
        }

        if ($usePush) {
            $ids = array_map(function ($c) { return $c['id']; }, $contacts);
            $in  = implode(',', array_fill(0, count($ids), '?'));
            $d   = $db->prepare("SELECT id, token FROM push_tokens WHERE is_active = 'yes' AND client_id IN ($in)");
            $d->execute($ids);
            $devices = $d->fetchAll(PDO::FETCH_ASSOC);
            $stats['push']['devices'] = count($devices);
            if ($devices) {
                $r = PushSender::sendToTokens($db, $devices, array(
                    'title' => $dot . ' ' . $member . ' checked in',
                    'body'  => $status . "\n" . 'Attendance marked at ' . $time . ' · ' . $day,
                    'nid'   => $nid,
                ));
                $stats['push']['sent']   = $r['sent'];
                $stats['push']['failed'] = $r['failed'];
            }
        }
        return $stats;
    }
}
