<?php
require_once __DIR__ . '/WhatsApp.php';

/**
 * Admin WhatsApp broadcasts (manually typed message → many members).
 *
 * WhatsApp only allows approved templates for business-initiated messages, so the
 * admin's text is placed inside the progym_announcement(_image) template.
 * Recipients are queued in whatsapp_queue and sent in batches by process(), which runs
 * right after a broadcast is created and from cron (api/whatsapp/processQueue.php).
 * process() stops at the daily cap (config `broadcast_daily_cap`) so a large blast is
 * spread over several days and stays inside Meta's per-day messaging limit.
 */
class WhatsAppBroadcast {

    const DEFAULT_DAILY_CAP = 200;   // headroom under Meta's 250/day tier for receipts, alerts etc.
    const DEFAULT_PRICE_INR = 0.86;  // approx. India marketing template price per message

    public static function dailyCap() {
        $cfg = WhatsApp::config();
        return isset($cfg['broadcast_daily_cap']) ? intval($cfg['broadcast_daily_cap']) : self::DEFAULT_DAILY_CAP;
    }

    public static function pricePerMessage() {
        $cfg = WhatsApp::config();
        return isset($cfg['marketing_price_inr']) ? floatval($cfg['marketing_price_inr']) : self::DEFAULT_PRICE_INR;
    }

    public static function sentToday($db) {
        $s = $db->prepare("SELECT COUNT(*) FROM whatsapp_queue WHERE status = 'sent' AND processed_at >= ?");
        $s->execute([date('Y-m-d 00:00:00')]);
        return intval($s->fetchColumn());
    }

    /** Members in the audience with a usable mobile, one entry per mobile number. */
    public static function recipients($db, $where, $params) {
        $s = $db->prepare("SELECT c.id, c.name, c.mobile FROM client c WHERE $where ORDER BY c.id");
        $s->execute($params);
        $out = [];
        $skipped = 0;
        foreach ($s->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $to = WhatsApp::normalizeMobile($r['mobile']);
            if ($to === null || isset($out[$to])) { $skipped++; continue; }
            $out[$to] = $r;
        }
        return [$out, $skipped];
    }

    /** Create the broadcast + queue rows. Returns the new broadcast id. */
    public static function create($db, $title, $message, $imageUrl, $audience, $audienceValue, $createdBy, $pushBroadcastId, $where, $params) {
        list($recipients, $skipped) = self::recipients($db, $where, $params);

        $db->exec("SET NAMES utf8mb4");
        $s = $db->prepare(
            "INSERT INTO whatsapp_broadcasts
               (push_broadcast_id, title, message, image, audience, audience_value, created_by, created_at, total, skipped, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $s->execute([
            $pushBroadcastId ?: null, $title, $message, $imageUrl, $audience,
            $audienceValue !== '' ? $audienceValue : null, $createdBy, date('Y-m-d H:i:s'),
            count($recipients), $skipped, count($recipients) ? 'queued' : 'done',
        ]);
        $id = intval($db->lastInsertId());

        $q = $db->prepare("INSERT INTO whatsapp_queue (broadcast_id, client_id, name, mobile, status) VALUES (?, ?, ?, ?, 'pending')");
        foreach ($recipients as $mobile => $r) {
            $q->execute([$id, $r['id'], $r['name'], $mobile]);
        }
        return $id;
    }

    /**
     * Send up to $limit pending messages (oldest broadcast first), never exceeding today's cap.
     * A lock file keeps cron and the post-create run from sending the same rows twice.
     */
    public static function process($db, $limit = 40) {
        $lock = fopen(sys_get_temp_dir() . '/progym_wa_broadcast.lock', 'c');
        if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return ['sent' => 0, 'failed' => 0, 'locked' => true];

        $sent = 0; $failed = 0;
        try {
            $room = max(0, self::dailyCap() - self::sentToday($db));
            $limit = min($limit, $room);
            if ($limit <= 0) return ['sent' => 0, 'failed' => 0, 'capReached' => true];

            $rows = $db->query(
                "SELECT q.id, q.broadcast_id, q.client_id, q.name, q.mobile, b.title, b.message, b.image
                 FROM whatsapp_queue q JOIN whatsapp_broadcasts b ON b.id = q.broadcast_id
                 WHERE q.status = 'pending'
                 ORDER BY q.broadcast_id, q.id
                 LIMIT " . intval($limit)
            )->fetchAll(PDO::FETCH_ASSOC);

            $upd = $db->prepare("UPDATE whatsapp_queue SET status = ?, wamid = ?, error = ?, processed_at = ? WHERE id = ?");
            $touched = [];
            foreach ($rows as $r) {
                $text = $r['title'] !== '' && $r['title'] !== null ? '*' . $r['title'] . '* — ' . $r['message'] : $r['message'];
                $tpl  = $r['image'] ? WhatsApp::TPL_ANNOUNCEMENT_IMAGE : WhatsApp::TPL_ANNOUNCEMENT;
                $ok   = WhatsApp::sendTemplate($db, 'broadcast', $r['client_id'], $r['mobile'], $tpl,
                            [$r['name'] ?: 'Member', $text], 'en', $r['image'] ?: null);
                $upd->execute([
                    $ok ? 'sent' : 'failed', WhatsApp::$lastWamid,
                    $ok ? null : mb_substr((string)WhatsApp::$lastError, 0, 250),
                    date('Y-m-d H:i:s'), $r['id'],
                ]);
                $ok ? $sent++ : $failed++;
                $touched[$r['broadcast_id']] = true;
            }

            foreach (array_keys($touched) as $bid) self::refreshCounts($db, $bid);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
        return ['sent' => $sent, 'failed' => $failed];
    }

    public static function refreshCounts($db, $broadcastId) {
        $s = $db->prepare(
            "UPDATE whatsapp_broadcasts b SET
               sent    = (SELECT COUNT(*) FROM whatsapp_queue WHERE broadcast_id = b.id AND status = 'sent'),
               failed  = (SELECT COUNT(*) FROM whatsapp_queue WHERE broadcast_id = b.id AND status = 'failed'),
               status  = IF((SELECT COUNT(*) FROM whatsapp_queue WHERE broadcast_id = b.id AND status = 'pending') = 0, 'done', 'sending')
             WHERE b.id = ?"
        );
        $s->execute([$broadcastId]);
    }
}
