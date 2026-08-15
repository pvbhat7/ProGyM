<?php
class EmailLogger {
    public static function log(
        $db,
        $type,
        $clientId,
        $recipientName,
        $recipientEmail,
        $recipientMobile,
        $subject,
        $bodyHtml,
        $smsText,
        $whatsappText,
        $status,
        $errorMessage = null,
        $triggeredBy = 'system'
    ) {
        try {
            date_default_timezone_set('Asia/Calcutta');
            // Emojis in smsText/whatsappText/subject are 4-byte UTF-8; the default
            // connection charset is 'utf8' (3-byte only) which would store them as '?'.
            $db->exec("SET NAMES utf8mb4");
            $stmt = $db->prepare(
                "INSERT INTO email_log
                 (clientId, recipientName, recipientEmail, recipientMobile, type,
                  subject, bodyHtml, smsText, whatsappText,
                  status, errorMessage, triggeredBy, sentAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $clientId ? intval($clientId) : null,
                $recipientName,
                $recipientEmail,
                $recipientMobile,
                $type,
                mb_substr((string)$subject, 0, 500),
                $bodyHtml,
                $smsText,
                $whatsappText,
                $status,
                $errorMessage ? mb_substr((string)$errorMessage, 0, 500) : null,
                $triggeredBy,
                date('Y-m-d H:i:s'),
            ]);
            return (int)$db->lastInsertId();
        } catch (Exception $e) {
            error_log('EmailLogger error: ' . $e->getMessage());
            return false;
        }
    }
}
