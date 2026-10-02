<?php
require_once __DIR__ . '/../config/mail_config.php';
require_once __DIR__ . '/../lib/phpmailer/src/Exception.php';
require_once __DIR__ . '/../lib/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/phpmailer/src/SMTP.php';
require_once __DIR__ . '/EmailLogger.php';
require_once __DIR__ . '/WhatsApp.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class WelcomeEmail {

    /**
     * Send a welcome email to a newly registered member.
     * Silently skips if the client has no email address.
     */
    public static function send($db, $clientId) {
        $s = $db->prepare("SELECT name, email, mobile, admissionDate FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client) return false;

        WhatsApp::sendTemplate($db, 'welcome', $clientId, $client['mobile'] ?? '', WhatsApp::TPL_WELCOME,
            [$client['name'], GYM_NAME . ', ' . GYM_CITY]);

        if (empty(trim($client['email'] ?? ''))) return false;

        $dt          = DateTime::createFromFormat('d/m/Y', $client['admissionDate']);
        $dateDisplay = $dt ? $dt->format('D, d M Y') : date('D, d M Y');

        $html        = self::buildHtml(htmlspecialchars($client['name']), $dateDisplay);
        $subject     = "\xF0\x9F\x8F\x8B Welcome to " . GYM_NAME . ', ' . GYM_CITY . '!';
        $gymLabel    = GYM_NAME . ', ' . GYM_CITY;
        $smsText     = "Hi {$client['name']}, welcome to {$gymLabel}! 100 ProCoins credited to your wallet as welcome bonus. Login at https://progym.co.in";
        $whatsapp    = "🏋 *Welcome to {$gymLabel}!*\n\nHi {$client['name']}, your membership is now active.\n\n🎉 *100 ProCoins* credited to your wallet as a welcome bonus.\n\n👉 Login: https://progym.co.in/login";

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
            EmailLogger::log($db, 'welcome', $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'sent');
            return true;
        } catch (Exception $e) {
            error_log('WelcomeEmail error: ' . $e->getMessage());
            EmailLogger::log($db, 'welcome', $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'failed', $e->getMessage());
            return false;
        }
    }

    private static function buildHtml($clientName, $dateDisplay) {
        $logo    = GYM_LOGO_URL;
        $gymName = GYM_NAME . ', ' . GYM_CITY;
        $phone1  = GYM_PHONE1;
        $wa      = GYM_WHATSAPP;

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
                    <span style="display:block;font-size:17px;font-weight:bold;color:#ffffff;line-height:1.3;">{$gymName}</span>
                    <span style="display:block;font-size:11px;color:#94a3b8;line-height:1.4;letter-spacing:0.3px;">Fitness &amp; Wellness</span>
                  </span>
                </td>
                <td align="right" style="font-size:11px;color:#94a3b8;vertical-align:middle;white-space:nowrap;">{$dateDisplay}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── WELCOME HERO ── -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px 28px;text-align:center;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:18px;">
                    <tr>
                      <td align="center" style="width:64px;height:64px;background:#fef9c3;border-radius:50%;
                                                font-size:30px;line-height:64px;">
                        &#11088;
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">Welcome to {$gymName}!</p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                    Hi <strong style="color:#0f172a;">{$clientName}</strong>, your membership has been created.<br>
                    We're thrilled to have you on board — let's get started!
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── PROCOIN WELCOME BONUS ── -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center"
                    style="background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:16px;padding:28px 20px;">
                  <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">
                    Welcome Bonus
                  </p>
                  <p style="margin:0;font-size:48px;font-weight:900;color:#ffffff;letter-spacing:-1px;line-height:1.1;">
                    &#127881; 100
                  </p>
                  <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">
                    ProCoins credited to your wallet
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── HOW TO EARN PROCOINS ── -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 20px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#f8fafc;padding:9px 16px;font-size:10px;font-weight:700;
                    color:#94a3b8;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
                  &#127881;&nbsp; How to Earn More ProCoins
                </td>
              </tr>
              <tr>
                <td style="padding:7px 16px;font-size:12px;font-weight:700;color:#64748b;
                    border-bottom:1px solid #f1f5f9;background:#fafafa;width:70%;">Activity</td>
                <td style="padding:7px 16px;font-size:12px;font-weight:700;color:#64748b;
                    border-bottom:1px solid #f1f5f9;background:#fafafa;text-align:right;">Coins</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">
                  &#127942;&nbsp; Signup Welcome Bonus
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;border-bottom:1px solid #f1f5f9;">+100</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;background:#fafafa;">
                  &#128176;&nbsp; Full Package Payment Completion
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;border-bottom:1px solid #f1f5f9;background:#fafafa;">+25</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">
                  &#128247;&nbsp; Upload Weekly Progress Photo
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;border-bottom:1px solid #f1f5f9;">+5</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;background:#fafafa;">
                  &#128100;&nbsp; Profile Picture Update (once/month)
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;border-bottom:1px solid #f1f5f9;background:#fafafa;">+10</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">
                  &#9878;&nbsp; Daily Attendance Check-in
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;border-bottom:1px solid #f1f5f9;">+1</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;background:#fafafa;">
                  &#9878;&nbsp; Weight Tracker Update (once/week)
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;background:#fafafa;">+2</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── HOW TO REDEEM ── -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr>
                <td style="background:#f0fdf4;padding:9px 16px;font-size:10px;font-weight:700;
                    color:#16a34a;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #dcfce7;">
                  &#128274;&nbsp; How to Redeem &nbsp;&#183;&nbsp; 1 ProCoin = &#8377;1
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;font-size:13px;color:#475569;line-height:1.8;background:#ffffff;">
                  &#128176;&nbsp; <strong style="color:#0f172a;">Package Discount:</strong>
                  Tell the gym admin to apply your coins when making your next payment — coins directly reduce the cash amount due.<br>
                  &#127873;&nbsp; <strong style="color:#0f172a;">Shop Merchandise:</strong>
                  Open the ProCoins section in the app → tap Shop → redeem coins for gym products. Admin approves and you collect at the gym.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── LOGIN CTA ── -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;text-align:center;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <p style="margin:0 0 14px;font-size:12px;color:#64748b;">
              Log in with your mobile number to get started
            </p>
            <a href="https://progym.co.in/login"
               style="display:inline-block;background:#0f172a;color:#ffffff;
                      font-size:13px;font-weight:700;text-decoration:none;
                      padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">
              &#128274;&nbsp; Login to ProGym
            </a>
          </td>
        </tr>

        <!-- ── GYM CONTACT + SOCIAL ── -->
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
