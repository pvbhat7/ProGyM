<?php
require_once __DIR__ . '/../config/mail_config.php';
require_once __DIR__ . '/../lib/phpmailer/src/Exception.php';
require_once __DIR__ . '/../lib/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/phpmailer/src/SMTP.php';
require_once __DIR__ . '/EmailLogger.php';
require_once __DIR__ . '/WhatsApp.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class PaymentEmail {

    /**
     * Send a payment-received email for a given transaction.
     * Silently skips if the client has no email address.
     */
    public static function send($db, $clientId, $packageDetailsId, $feesPaid, $paymentDate) {
        if (floatval($feesPaid) <= 0) return;

        // Client name + email + mobile
        $s = $db->prepare("SELECT name, email, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client) return;

        // Package details + plan name
        $s = $db->prepare(
            "SELECT pd.fees, pd.startDate, pd.endDate,
                    COALESCE(NULLIF(p.description,''), pd.description, 'Package') AS packageName
             FROM packagedetails pd
             LEFT JOIN packages p ON p.id = pd.packageId
             WHERE pd.id = ? LIMIT 1"
        );
        $s->execute([$packageDetailsId]);
        $pkg = $s->fetch(PDO::FETCH_ASSOC);
        if (!$pkg) return;

        // Total paid (including this new transaction which is already inserted)
        $s = $db->prepare(
            "SELECT COALESCE(SUM(feesPaid + IFNULL(proCoinsUsed, 0)), 0) AS totalPaid
             FROM paymenttransaction
             WHERE packageDetailsId = ? AND discontinue = 'false'"
        );
        $s->execute([$packageDetailsId]);
        $totalPaid = floatval($s->fetchColumn());
        $remaining = max(0, floatval($pkg['fees']) - $totalPaid);

        WhatsApp::sendTemplate($db, 'payment', $clientId, $client['mobile'] ?? '', WhatsApp::TPL_PAYMENT, [
            $client['name'],
            number_format(floatval($feesPaid), 0),
            $pkg['packageName'],
            $paymentDate,
            $remaining <= 0 ? 'Fully paid' : 'Balance: Rs.' . number_format($remaining, 0),
            GYM_NAME . ', ' . GYM_CITY,
        ]);

        if (empty(trim($client['email'] ?? ''))) return;

        // Format header date (e.g. "Fri, 24 Apr 2026")
        $dt          = DateTime::createFromFormat('d/m/Y', $paymentDate);
        $dateDisplay = $dt ? $dt->format('D, d M Y') : $paymentDate;

        $html = self::buildHtml(
            htmlspecialchars($client['name']),
            htmlspecialchars($pkg['packageName']),
            $pkg['startDate'] . ' – ' . $pkg['endDate'],
            $paymentDate,
            floatval($feesPaid),
            $remaining,
            $dateDisplay
        );

        $gymLabel  = GYM_NAME . ', ' . GYM_CITY;
        $subject   = "Payment Confirmation – {$gymLabel}";
        $paidInt   = number_format(floatval($feesPaid), 0);
        $remInt    = number_format($remaining, 0);
        $remLine   = $remaining <= 0 ? 'Fully Paid ✓' : "Balance: Rs.{$remInt}";
        $smsText   = "Hi {$client['name']}, payment of Rs.{$paidInt} received for {$pkg['packageName']} ({$gymLabel}). {$remLine}. Thank you!";
        $whatsapp  = "✅ *Payment Confirmed*\n\nHi {$client['name']},\n\n💰 Amount: *Rs.{$paidInt}*\n📦 Package: {$pkg['packageName']}\n📅 Date: {$paymentDate}\n{$remLine}\n\nThank you for choosing {$gymLabel}!";

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
            EmailLogger::log($db, 'payment', $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'sent');
        } catch (Exception $e) {
            // Log silently — don't break the API response on email failure
            error_log('PaymentEmail error: ' . $e->getMessage());
            EmailLogger::log($db, 'payment', $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'failed', $e->getMessage());
        }
    }

    private static function buildHtml($clientName, $packageName, $duration, $paymentDate, $paid, $remaining, $dateDisplay) {
        $paidFmt  = '&#8377; ' . number_format($paid, 0);
        $paidRow  = '&#8377; ' . number_format($paid, 1);
        $remColor = $remaining <= 0 ? '#15803d' : '#dc2626';
        $remLabel = $remaining <= 0 ? '&#8377; 0 &nbsp;&#10003; Fully Paid' : '&#8377; ' . number_format($remaining, 1);
        $logo     = GYM_LOGO_URL;
        $gymName  = GYM_NAME . ', ' . GYM_CITY;
        $phone1   = GYM_PHONE1;
        $wa       = GYM_WHATSAPP;

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

        <!-- ── HEADER ── -->
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
                <td align="right" style="font-size:11px;color:#94a3b8;vertical-align:middle;white-space:nowrap;">{$dateDisplay}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── SUCCESS HERO ── -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px 28px;text-align:center;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center">
                  <!-- Checkmark badge -->
                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:18px;">
                    <tr>
                      <td align="center" style="width:58px;height:58px;background:#dcfce7;border-radius:50%;
                                                font-size:26px;color:#16a34a;font-weight:bold;line-height:58px;">
                        &#10003;
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">Payment Confirmed</p>
                  <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.5;">
                    Hi <strong style="color:#0f172a;">{$clientName}</strong>, your payment has been received successfully.
                  </p>
                  <!-- Paid amount pill -->
                  <table cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td align="center" style="background:#fff7ed;border:1.5px solid #fed7aa;
                                                border-radius:12px;padding:14px 40px;">
                        <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9a3412;
                                  letter-spacing:1px;text-transform:uppercase;">Amount Paid</p>
                        <p style="margin:0;font-size:32px;font-weight:800;color:#ea580c;line-height:1.2;">{$paidFmt}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── RECEIPT DETAILS ── -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:collapse;overflow:hidden;">
              <!-- Section label -->
              <tr>
                <td colspan="2" style="background:#f8fafc;padding:9px 16px;
                    font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;
                    text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
                  Receipt Details
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;width:44%;border-bottom:1px solid #f1f5f9;background:#ffffff;">Package</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;background:#ffffff;">{$packageName}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Duration</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;background:#f8fafc;">{$duration}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#ffffff;">Payment Date</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;background:#ffffff;">{$paymentDate}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Status</td>
                <td style="padding:11px 16px;border-bottom:1px solid #f1f5f9;background:#f8fafc;">
                  <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;
                               font-weight:700;padding:3px 10px;border-radius:20px;">&#10003; Success</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#ffffff;">Amount Paid</td>
                <td style="padding:11px 16px;font-size:13px;color:#0f172a;font-weight:700;border-bottom:1px solid #f1f5f9;background:#ffffff;">{$paidRow}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:13px;color:#64748b;background:#f8fafc;">Remaining Balance</td>
                <td style="padding:11px 16px;font-size:13px;font-weight:700;color:{$remColor};background:#f8fafc;">{$remLabel}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── APP LOGIN CTA ── -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" align="center" width="100%">
              <tr>
                <td align="center">
                  <p style="margin:0 0 14px;font-size:12px;color:#64748b;">
                    Track your workouts, diet &amp; attendance on the ProGym app
                  </p>
                  <a href="https://progym.co.in/login"
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

        <!-- ── GYM CONTACT + SOCIAL ── -->
        <tr>
          <td style="background:#f8fafc;padding:22px 32px;text-align:center;
                     border:1px solid #e2e8f0;border-top:none;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#0f172a;">{$gymName}</p>
            <p style="margin:0 0 16px;font-size:12px;color:#64748b;">&#128222;&nbsp;{$phone1}</p>
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

        <!-- ── DEVELOPER FOOTER ── -->
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
