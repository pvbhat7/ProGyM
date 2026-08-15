<?php
require_once __DIR__ . '/../config/mail_config.php';
require_once __DIR__ . '/../lib/phpmailer/src/Exception.php';
require_once __DIR__ . '/../lib/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/phpmailer/src/SMTP.php';
require_once __DIR__ . '/EmailLogger.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class ReminderEmail {

    public static function send($db, $clientId) {
        $s = $db->prepare("SELECT name, email, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client || empty(trim($client['email'] ?? ''))) return false;

        $s = $db->prepare(
            "SELECT pd.id, pd.fees, pd.startDate, pd.endDate,
                    COALESCE(NULLIF(p.description,''), pd.description, 'Membership') AS packageName
             FROM packagedetails pd
             LEFT JOIN packages p ON p.id = pd.packageId
             WHERE pd.clientId = ? AND pd.discontinue = 'false'
             ORDER BY pd.id DESC LIMIT 1"
        );
        $s->execute([$clientId]);
        $pkg = $s->fetch(PDO::FETCH_ASSOC);
        if (!$pkg) return false;

        $s = $db->prepare(
            "SELECT COALESCE(SUM(feesPaid), 0) FROM paymenttransaction
             WHERE packageDetailsId = ? AND discontinue = 'false'"
        );
        $s->execute([$pkg['id']]);
        $totalPaid = floatval($s->fetchColumn());
        $remaining = max(0, floatval($pkg['fees']) - $totalPaid);

        $endDate  = DateTime::createFromFormat('d/m/Y', $pkg['endDate']);
        $today    = new DateTime(); $today->setTime(0, 0, 0);
        $daysLeft = $endDate ? intval($today->diff($endDate)->days * ($endDate >= $today ? 1 : -1)) : null;

        $html = self::buildHtml(
            htmlspecialchars($client['name']),
            htmlspecialchars($pkg['packageName']),
            $pkg['startDate'],
            $pkg['endDate'],
            floatval($pkg['fees']),
            $totalPaid,
            $remaining,
            $daysLeft
        );

        $gymLabel = GYM_NAME . ', ' . GYM_CITY;
        $subject  = "Membership Reminder – {$gymLabel}";

        $remInt  = number_format($remaining, 0);
        $hasDues = $remaining > 0;
        if ($daysLeft !== null && $daysLeft < 0) {
            $statusLine = "Membership expired " . abs($daysLeft) . " day(s) ago";
        } elseif ($daysLeft !== null && $daysLeft === 0) {
            $statusLine = "Membership expires today";
        } elseif ($daysLeft !== null) {
            $statusLine = "Membership expires in {$daysLeft} day(s)";
        } else {
            $statusLine = "Membership update";
        }
        $duesLine  = $hasDues ? "Pending balance: Rs.{$remInt}." : "Fully paid ✓";
        $smsText   = "Hi {$client['name']}, {$statusLine}. {$duesLine} Please renew. – {$gymLabel}";
        $whatsapp  = "📋 *Membership Reminder*\n\nHi {$client['name']},\n\n📦 Package: {$pkg['packageName']}\n📅 Valid: {$pkg['startDate']} – {$pkg['endDate']}\n⏰ {$statusLine}\n💰 {$duesLine}\n\nVisit us or call to renew. – {$gymLabel}";

        try {
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = SMTP_USER;
            $mail->Password   = SMTP_PASS;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom(SMTP_USER, MAIL_FROM_NAME);
            $mail->addAddress(trim($client['email']), $client['name']);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $html;

            $mail->send();
            EmailLogger::log($db, 'reminder', $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'sent');
            return true;
        } catch (Exception $e) {
            error_log('ReminderEmail error: ' . $e->getMessage());
            EmailLogger::log($db, 'reminder', $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'failed', $e->getMessage());
            return false;
        }
    }

    private static function buildHtml($clientName, $packageName, $startDate, $endDate, $fees, $totalPaid, $remaining, $daysLeft) {
        $hasDues       = $remaining > 0;
        $isPastDue     = $daysLeft !== null && $daysLeft < 0;
        $isExpiring    = $daysLeft !== null && $daysLeft >= 0 && $daysLeft <= 5;

        if ($hasDues && ($isPastDue || $isExpiring)) {
            $heroTitle   = 'Action Required';
            $heroColor   = '#dc2626';
            $heroIconBg  = '#fee2e2';
            $heroIcon    = '&#9888;';
            $subtext     = "Hi <strong style=\"color:#0f172a;\">{$clientName}</strong>, your membership has a pending balance and is " . ($isPastDue ? 'expired' : 'expiring soon') . ".";
        } elseif ($hasDues) {
            $heroTitle   = 'Payment Reminder';
            $heroColor   = '#ea580c';
            $heroIconBg  = '#fed7aa';
            $heroIcon    = '&#9993;';
            $subtext     = "Hi <strong style=\"color:#0f172a;\">{$clientName}</strong>, you have a pending balance on your membership.";
        } elseif ($isPastDue) {
            $heroTitle   = 'Membership Expired';
            $heroColor   = '#64748b';
            $heroIconBg  = '#e2e8f0';
            $heroIcon    = '&#128197;';
            $subtext     = "Hi <strong style=\"color:#0f172a;\">{$clientName}</strong>, your membership has expired. Renew today to continue your fitness journey!";
        } elseif ($isExpiring) {
            $heroTitle   = 'Expiring Soon';
            $heroColor   = '#d97706';
            $heroIconBg  = '#fef3c7';
            $heroIcon    = '&#9200;';
            $daysWord    = $daysLeft == 1 ? '1 day' : "{$daysLeft} days";
            $subtext     = "Hi <strong style=\"color:#0f172a;\">{$clientName}</strong>, your membership expires in <strong>{$daysWord}</strong>. Renew now to stay on track!";
        } else {
            $heroTitle   = 'Membership Reminder';
            $heroColor   = '#0f172a';
            $heroIconBg  = '#f1f5f9';
            $heroIcon    = '&#128170;';
            $subtext     = "Hi <strong style=\"color:#0f172a;\">{$clientName}</strong>, here's a quick update on your membership status.";
        }

        $feesFmt  = '&#8377; ' . number_format($fees, 0);
        $paidFmt  = '&#8377; ' . number_format($totalPaid, 0);
        $remColor = $remaining <= 0 ? '#15803d' : '#dc2626';
        $remLabel = $remaining <= 0
            ? '&#8377; 0 &nbsp;&#10003; Fully Paid'
            : '&#8377; ' . number_format($remaining, 0);

        if ($daysLeft === null) {
            $daysDisplay = '—';
        } elseif ($daysLeft < 0) {
            $n = abs($daysLeft);
            $daysDisplay = "Expired {$n} day" . ($n == 1 ? '' : 's') . " ago";
        } elseif ($daysLeft === 0) {
            $daysDisplay = 'Expires today';
        } else {
            $daysDisplay = "Expires in {$daysLeft} day" . ($daysLeft == 1 ? '' : 's');
        }

        $logo    = GYM_LOGO_URL;
        $gymName = GYM_NAME . ', ' . GYM_CITY;
        $phone1  = GYM_PHONE1;
        $wa      = GYM_WHATSAPP;
        $today   = date('D, d M Y');

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

        <!-- HEADER -->
        <tr>
          <td style="background:#0f172a;border-radius:16px 16px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="{$logo}" alt="Logo" width="48" height="48"
                       style="display:inline-block;vertical-align:middle;border-radius:8px;">
                  <span style="display:inline-block;vertical-align:middle;padding-left:12px;">
                    <span style="display:block;font-size:17px;font-weight:bold;color:#ffffff;line-height:1.3;">Pro Gym</span>
                    <span style="display:block;font-size:11px;color:#94a3b8;line-height:1.4;letter-spacing:0.3px;">Kolhapur</span>
                  </span>
                </td>
                <td align="right" style="font-size:11px;color:#94a3b8;vertical-align:middle;white-space:nowrap;">{$today}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px 28px;text-align:center;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:18px;">
                    <tr>
                      <td align="center" style="width:58px;height:58px;background:{$heroIconBg};border-radius:50%;
                                                font-size:26px;line-height:58px;">
                        {$heroIcon}
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:{$heroColor};letter-spacing:-0.3px;">{$heroTitle}</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">{$subtext}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- MEMBERSHIP DETAILS -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:collapse;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#f8fafc;padding:9px 16px;
                    font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;
                    text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
                  Membership Details
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;width:44%;border-bottom:1px solid #f1f5f9;background:#ffffff;">Package</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;background:#ffffff;">{$packageName}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Valid</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;background:#f8fafc;">{$startDate} – {$endDate}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#ffffff;">Status</td>
                <td style="padding:11px 16px;font-size:13px;font-weight:600;color:{$heroColor};border-bottom:1px solid #f1f5f9;background:#ffffff;">{$daysDisplay}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Total Fees</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;background:#f8fafc;">{$feesFmt}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#ffffff;">Amount Paid</td>
                <td style="padding:11px 16px;font-size:13px;color:#15803d;font-weight:700;border-bottom:1px solid #f1f5f9;background:#ffffff;">{$paidFmt}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;background:#f8fafc;">Remaining Balance</td>
                <td style="padding:11px 16px;font-size:13px;font-weight:700;color:{$remColor};background:#f8fafc;">{$remLabel}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" align="center" width="100%">
              <tr>
                <td align="center">
                  <p style="margin:0 0 14px;font-size:12px;color:#64748b;">
                    Visit us or contact to renew your membership
                  </p>
                  <a href="https://tavrostechinfo.com/progym/login"
                     style="display:inline-block;background:#0f172a;color:#ffffff;
                            font-size:13px;font-weight:700;text-decoration:none;
                            padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">
                    &#128274;&nbsp; Login to ProGym App
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- GYM CONTACT -->
        <tr>
          <td style="background:#f8fafc;padding:22px 32px;text-align:center;
                     border:1px solid #e2e8f0;border-top:none;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#0f172a;">{$gymName}</p>
            <p style="margin:0 0 16px;font-size:12px;color:#64748b;">
              &#128222;&nbsp;<a href="tel:+91{$phone1}" style="color:#64748b;text-decoration:none;">{$phone1}</a>
            </p>
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="padding:0 5px;">
                  <a href="https://www.facebook.com/progymkop" style="text-decoration:none;display:block;">
                    <img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook"
                         width="36" height="36" style="display:block;border:0;">
                  </a>
                </td>
                <td style="padding:0 5px;">
                  <a href="https://www.instagram.com/progymkop/" style="text-decoration:none;display:block;">
                    <img src="https://img.icons8.com/color/48/instagram-new.png" alt="Instagram"
                         width="36" height="36" style="display:block;border:0;">
                  </a>
                </td>
                <td style="padding:0 5px;">
                  <a href="https://wa.me/{$wa}" style="text-decoration:none;display:block;">
                    <img src="https://img.icons8.com/color/48/whatsapp.png" alt="WhatsApp"
                         width="36" height="36" style="display:block;border:0;">
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DEVELOPER FOOTER -->
        <tr>
          <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:18px 32px;text-align:center;">
            <p style="margin:0 0 10px;font-size:10px;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">
              Software Developed By
            </p>
            <a href="https://tavrostechinfo.com/" style="display:inline-block;border:0;text-decoration:none;">
              <img src="https://tavrostechinfo.com/PROGYM/brand/upgradePlan2_img52.jpg"
                   alt="Prashant Bhat" width="140"
                   style="display:block;width:140px;height:auto;border:0;border-radius:6px;opacity:0.9;">
            </a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
HTML;
    }
}
