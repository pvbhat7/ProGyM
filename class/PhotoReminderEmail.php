<?php
require_once __DIR__ . '/../config/mail_config.php';
require_once __DIR__ . '/../lib/phpmailer/src/Exception.php';
require_once __DIR__ . '/../lib/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/phpmailer/src/SMTP.php';
require_once __DIR__ . '/EmailLogger.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class PhotoReminderEmail {

    public static function send($db, $clientId) {
        $s = $db->prepare("SELECT name, email, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client || empty(trim($client['email'] ?? ''))) return 'no_email';

        $name      = $client['name'];
        $subject   = 'Complete Your ProGym Profile & Earn 10 ProCoins';
        $html      = self::buildHtml(htmlspecialchars($name));
        $smsText   = "Hi {$name}! Your ProGym profile photo is missing. Upload it & earn 10 ProCoins: https://tavrostechinfo.com/progym/upload-photo";
        $whatsapp  = "📸 *Complete Your ProGym Profile*\n\nHi {$name}!\n\nYour profile photo is missing. Upload it now and earn *10 ProCoins* instantly!\n\n👉 https://tavrostechinfo.com/progym/upload-photo\n\n– ProGym Team";

        try {
            $mail = self::makeMailer();
            $mail->addAddress(trim($client['email']), $name);
            $mail->Subject  = $subject;
            $mail->Body     = $html;
            $mail->AltBody  = "Hi {$name}! Greetings from ProGym. Your profile photo is missing - upload it & earn 10 ProCoins! Visit: https://tavrostechinfo.com/progym/upload-photo - ProGym Team";
            $mail->send();
            EmailLogger::log($db, 'photo_reminder', $clientId, $name, $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'sent');
            return 'ok';
        } catch (Exception $e) {
            error_log('PhotoReminderEmail error: ' . $e->getMessage());
            EmailLogger::log($db, 'photo_reminder', $clientId, $name, $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'failed', $e->getMessage());
            return $e->getMessage();
        }
    }

    private static function makeMailer() {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';
        $mail->isHTML(true);
        $mail->setFrom(SMTP_USER, MAIL_FROM_NAME);
        return $mail;
    }

    private static function buildHtml($clientName) {
        $logo      = GYM_LOGO_URL;
        $phone     = GYM_PHONE1;
        $wa        = GYM_WHATSAPP;
        $today     = date('D, d M Y');
        $uploadUrl = 'https://tavrostechinfo.com/progym/upload-photo';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;">
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
                      <td align="center" style="width:64px;height:64px;background:#dcfce7;border-radius:50%;
                                                font-size:30px;line-height:64px;">
                        &#128247;
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#16a34a;letter-spacing:-0.3px;">Your Profile is Almost Complete!</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                    Hi <strong style="color:#0f172a;">{$clientName}</strong>, warm greetings from ProGym!<br>
                    We noticed your profile is missing a photo. Add one and unlock a reward. &#127881;
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PROCOIN REWARD HIGHLIGHT -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #fde68a;border-radius:10px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#fef3c7;padding:9px 16px;
                    font-size:10px;font-weight:700;color:#92400e;letter-spacing:1px;
                    text-transform:uppercase;border-bottom:1px solid #fde68a;">
                  &#129689; Upload Your Photo &mdash; Earn ProCoins
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;font-size:22px;width:48px;background:#fffbeb;border-bottom:1px solid #fde68a;text-align:center;">&#128247;</td>
                <td style="padding:14px 16px;background:#fffbeb;border-bottom:1px solid #fde68a;">
                  <span style="font-size:16px;font-weight:800;color:#b45309;">Earn 10 ProCoins</span><br>
                  <span style="font-size:12px;color:#78350f;">Instantly credited when you upload your profile photo</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:12px 16px;background:#fef9c3;text-align:center;">
                  <span style="font-size:12px;color:#92400e;">
                    &#128161;&nbsp; <strong>1 ProCoin = &#8377;1</strong> &mdash; Redeem in the ProGym Shop for real discounts
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PROCOIN RULES -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#f8fafc;padding:9px 16px;
                    font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;
                    text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
                  Ways to Earn ProCoins
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:18px;width:40px;background:#ffffff;border-bottom:1px solid #f1f5f9;text-align:center;">&#129689;</td>
                <td style="padding:11px 16px;font-size:13px;background:#ffffff;border-bottom:1px solid #f1f5f9;">
                  <span style="font-weight:700;color:#0f172a;">100 ProCoins</span><br>
                  <span style="color:#64748b;font-size:12px;">Welcome bonus &mdash; already credited to your account</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:18px;background:#f8fafc;border-bottom:1px solid #f1f5f9;text-align:center;">&#128247;</td>
                <td style="padding:11px 16px;font-size:13px;background:#f8fafc;border-bottom:1px solid #f1f5f9;">
                  <span style="font-weight:700;color:#0f172a;">10 ProCoins</span><br>
                  <span style="color:#64748b;font-size:12px;">Upload your profile photo</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:18px;background:#ffffff;border-bottom:1px solid #f1f5f9;text-align:center;">&#129689;</td>
                <td style="padding:11px 16px;font-size:13px;background:#ffffff;border-bottom:1px solid #f1f5f9;">
                  <span style="font-weight:700;color:#0f172a;">25 ProCoins</span><br>
                  <span style="color:#64748b;font-size:12px;">Every order paid with coupon</span>
                </td>
              </tr>
              <tr>
                <td style="padding:11px 16px;font-size:18px;background:#f8fafc;text-align:center;">&#9878;</td>
                <td style="padding:11px 16px;font-size:13px;background:#f8fafc;">
                  <span style="font-weight:700;color:#0f172a;">10 ProCoins</span><br>
                  <span style="color:#64748b;font-size:12px;">Each approved daily challenge</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 32px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" align="center" width="100%">
              <tr>
                <td align="center">
                  <p style="margin:0 0 16px;font-size:13px;color:#64748b;text-align:center;">
                    It takes less than a minute. Just log in and upload!
                  </p>
                  <a href="{$uploadUrl}"
                     style="display:inline-block;background:#16a34a;color:#ffffff;
                            font-size:14px;font-weight:700;text-decoration:none;
                            padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">
                    &#128247;&nbsp;&nbsp;Upload Your Photo Here
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
            <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#0f172a;">Pro Gym, Kolhapur</p>
            <p style="margin:0 0 16px;font-size:12px;color:#64748b;">
              &#128222;&nbsp;<a href="tel:+91{$phone}" style="color:#64748b;text-decoration:none;">{$phone}</a>
            </p>
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="padding:0 5px;">
                  <a href="https://www.facebook.com/progymkop" style="text-decoration:none;display:block;">
                    <img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook" width="36" height="36" style="display:block;border:0;">
                  </a>
                </td>
                <td style="padding:0 5px;">
                  <a href="https://www.instagram.com/progymkop/" style="text-decoration:none;display:block;">
                    <img src="https://img.icons8.com/color/48/instagram-new.png" alt="Instagram" width="36" height="36" style="display:block;border:0;">
                  </a>
                </td>
                <td style="padding:0 5px;">
                  <a href="https://wa.me/{$wa}" style="text-decoration:none;display:block;">
                    <img src="https://img.icons8.com/color/48/whatsapp.png" alt="WhatsApp" width="36" height="36" style="display:block;border:0;">
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
                   alt="Tavros Tech Info" width="140"
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
