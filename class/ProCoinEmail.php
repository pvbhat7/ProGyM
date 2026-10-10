<?php
require_once __DIR__ . '/../config/mail_config.php';
require_once __DIR__ . '/../lib/phpmailer/src/Exception.php';
require_once __DIR__ . '/../lib/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../lib/phpmailer/src/SMTP.php';
require_once __DIR__ . '/EmailLogger.php';
require_once __DIR__ . '/WhatsApp.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class ProCoinEmail {

    private static $mailer = null;

    private static function getMailer() {
        if (self::$mailer === null) {
            $m = new PHPMailer(true);
            $m->isSMTP();
            $m->Host          = SMTP_HOST;
            $m->SMTPAuth      = true;
            $m->Username      = SMTP_USER;
            $m->Password      = SMTP_PASS;
            $m->SMTPSecure    = PHPMailer::ENCRYPTION_STARTTLS;
            $m->Port          = SMTP_PORT;
            $m->CharSet       = 'UTF-8';
            $m->isHTML(true);
            $m->SMTPKeepAlive = true;
            $m->setFrom(SMTP_USER, MAIL_FROM_NAME);
            self::$mailer = $m;
        }
        return self::$mailer;
    }

    public static function sendBonus($db, $clientId, $amount, $title) {
        $s = $db->prepare("SELECT name, email, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client) return false;

        WhatsApp::sendTemplate($db, 'procoin_bonus', $clientId, $client['mobile'] ?? '', WhatsApp::TPL_PROCOINS,
            [$client['name'], intval($amount), $title]);

        if (empty(trim($client['email'] ?? ''))) return false;

        $amt  = intval($amount);
        $name = $client['name'];
        $html = self::buildHtml(
            htmlspecialchars($name),
            $amt,
            htmlspecialchars($title),
            'Thank you for being a valued member of ProGym. We appreciate your dedication to fitness and are gifting you these ProCoins as a token of our gratitude!',
            '#d97706',
            '#fef3c7',
            '&#127881;'
        );

        $subject  = "You've received ProCoins! – " . GYM_NAME;
        $smsText  = "Hi {$name}! 🎉 {$amt} ProCoins credited to your ProGym wallet ({$title}). View: https://progym.co.in";
        $whatsapp = "🎉 *ProCoins Credited!*\n\nHi {$name},\n\n💰 *{$amt} ProCoins* added to your ProGym wallet.\n📝 {$title}\n\n💡 1 ProCoin = ₹1\n👉 https://progym.co.in";

        return self::sendAndLog($db, 'procoin_bonus', $clientId, $client, $subject, $html, $smsText, $whatsapp);
    }

    /** $sendWhatsApp=false → admin sends the wish from their own WhatsApp app (Dashboard "App" mode). */
    public static function sendBirthdayGift($db, $clientId, $amount, $sendWhatsApp = true) {
        $s = $db->prepare("SELECT name, email, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client) return false;

        if ($sendWhatsApp) {
            WhatsApp::sendTemplate($db, 'procoin_birthday', $clientId, $client['mobile'] ?? '', WhatsApp::TPL_BIRTHDAY,
                [$client['name'], intval($amount)]);
        }

        if (empty(trim($client['email'] ?? ''))) return false;

        // Raw UTF-8 bytes for emoji (avoids HTML-entity issues in subject & body)
        $muscle = "\xF0\x9F\x92\xAA";                                          // 💪
        $pray   = "\xF0\x9F\x99\x8F\xF0\x9F\x8F\xBB";                         // 🙏🏻
        $cake   = "\xF0\x9F\x8E\x82";                                          // 🎂
        $party  = "\xF0\x9F\x8E\x89";                                          // 🎉
        $gym    = "\xF0\x9F\x8F\x8B\xF0\x9F\x8F\xBC\xE2\x80\x8D\xE2\x99\x82\xEF\xB8\x8F"; // 🏋🏼‍♂️

        $marathiMsg = $muscle . 'तुमच्या आयुष्यात आनंद, सुख आणि समृद्धी येवो. आरोग्यदायी आणि दीर्घायुष्य लाभो हीच ईश्वरचरणी प्रार्थना ' . $pray . '<br>'
                    . $cake . 'वाढदिवसाच्या लाख लाख शुभेच्छा' . $party . '<br>'
                    . $muscle . 'प्रो जिम कोल्हापूर' . $gym;

        $msg = $marathiMsg . '<br><br><em>As a birthday treat, we\'ve gifted you <strong>' . intval($amount) . ' ProCoins</strong> — credited to your account right now!</em>';

        $html = self::buildHtml(
            htmlspecialchars($client['name']),
            intval($amount),
            '&#127874; Happy Birthday!',
            $msg,
            '#db2777',
            '#fce7f3',
            '&#127874;'
        );

        $amt      = intval($amount);
        $name     = $client['name'];
        $subject  = $cake . ' Happy Birthday from ' . GYM_NAME . '!';
        $smsText  = "Happy Birthday {$name}! 🎂 {$amt} ProCoins gifted to your ProGym wallet. Wishing you health & happiness! – Pro Gym Kolhapur";
        $whatsapp = "🎂🎉 *HAPPY BIRTHDAY {$name}!* 🎉🎂\n\n💪 तुमच्या आयुष्यात आनंद, सुख आणि समृद्धी येवो.\n🙏🏻 आरोग्यदायी आणि दीर्घायुष्य लाभो.\n\n🎁 *Birthday Gift: {$amt} ProCoins* credited!\n\n💪 Pro Gym Kolhapur 🏋\n\n👉 https://progym.co.in";

        return self::sendAndLog($db, 'procoin_birthday', $clientId, $client, $subject, $html, $smsText, $whatsapp);
    }

    public static function sendGift($db, $clientId, $amount, $description) {
        $s = $db->prepare("SELECT name, email, mobile FROM client WHERE id = ? LIMIT 1");
        $s->execute([$clientId]);
        $client = $s->fetch(PDO::FETCH_ASSOC);
        if (!$client) return false;

        WhatsApp::sendTemplate($db, 'procoin_gift', $clientId, $client['mobile'] ?? '', WhatsApp::TPL_PROCOINS,
            [$client['name'], intval($amount), $description]);

        if (empty(trim($client['email'] ?? ''))) return false;

        $amt  = intval($amount);
        $name = $client['name'];
        $html = self::buildHtml(
            htmlspecialchars($name),
            $amt,
            'Special ProCoin Reward',
            htmlspecialchars($description),
            '#0284c7',
            '#e0f2fe',
            '&#127873;'
        );

        $subject  = "ProCoins credited to your account – " . GYM_NAME;
        $smsText  = "Hi {$name}! 🎁 {$amt} ProCoins credited to your ProGym wallet. {$description}. View: https://progym.co.in";
        $whatsapp = "🎁 *Special ProCoin Reward*\n\nHi {$name},\n\n💰 *{$amt} ProCoins* credited to your wallet.\n📝 {$description}\n\n💡 1 ProCoin = ₹1\n👉 https://progym.co.in";

        return self::sendAndLog($db, 'procoin_gift', $clientId, $client, $subject, $html, $smsText, $whatsapp);
    }

    private static function sendAndLog($db, $type, $clientId, $client, $subject, $html, $smsText, $whatsapp) {
        try {
            $mail = self::getMailer();
            $mail->clearAddresses();
            $mail->addAddress(trim($client['email']), $client['name']);
            $mail->Subject = $subject;
            $mail->Body    = $html;
            $mail->send();
            EmailLogger::log($db, $type, $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'sent');
            return true;
        } catch (Exception $e) {
            error_log('ProCoinEmail error: ' . $e->getMessage());
            EmailLogger::log($db, $type, $clientId, $client['name'], $client['email'], $client['mobile'] ?? null, $subject, $html, $smsText, $whatsapp, 'failed', $e->getMessage());
            self::$mailer = null; // reset so next call gets a fresh connection
            return false;
        }
    }

    private static function buildHtml($clientName, $amount, $title, $message, $accentColor, $iconBg, $icon) {
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
                    <span style="display:block;font-size:17px;font-weight:bold;color:#ffffff;line-height:1.3;">{$gymName}</span>
                    <span style="display:block;font-size:11px;color:#94a3b8;line-height:1.4;letter-spacing:0.3px;">Fitness &amp; Wellness</span>
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
                      <td align="center" style="width:64px;height:64px;background:{$iconBg};border-radius:50%;
                                                font-size:30px;line-height:64px;">
                        {$icon}
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:{$accentColor};letter-spacing:-0.3px;">{$title}</p>
                  <p style="margin:0 0 6px;font-size:13px;color:#64748b;line-height:1.5;">
                    Hi <strong style="color:#0f172a;">{$clientName}</strong>,
                  </p>
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">{$message}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- COIN AMOUNT -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center"
                    style="background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:16px;padding:28px 20px;">
                  <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">
                    ProCoins Credited
                  </p>
                  <p style="margin:0;font-size:48px;font-weight:900;color:#ffffff;letter-spacing:-1px;line-height:1.1;">
                    &#127881; {$amount}
                  </p>
                  <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">
                    coins added to your ProGym wallet
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HOW TO EARN -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 20px;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#f8fafc;padding:9px 16px;font-size:10px;font-weight:700;
                    color:#94a3b8;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #e2e8f0;">
                  &#127881;&nbsp; How to Earn ProCoins
                </td>
              </tr>
              <tr>
                <td style="padding:7px 16px;font-size:12px;font-weight:700;color:#64748b;
                    border-bottom:1px solid #f1f5f9;background:#fafafa;width:70%;">
                  Activity
                </td>
                <td style="padding:7px 16px;font-size:12px;font-weight:700;color:#64748b;
                    border-bottom:1px solid #f1f5f9;background:#fafafa;text-align:right;">
                  Coins
                </td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">
                  &#127942;&nbsp; Signup Welcome Bonus
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;
                    text-align:right;border-bottom:1px solid #f1f5f9;">+100</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;background:#fafafa;">
                  &#128176;&nbsp; Full Package Payment Completion
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;
                    text-align:right;border-bottom:1px solid #f1f5f9;background:#fafafa;">+25</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">
                  &#128247;&nbsp; Upload Weekly Progress Photo
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;
                    text-align:right;border-bottom:1px solid #f1f5f9;">+5</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;background:#fafafa;">
                  &#128100;&nbsp; Profile Picture Update (once/month)
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;
                    text-align:right;border-bottom:1px solid #f1f5f9;background:#fafafa;">+10</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;">
                  &#9878;&nbsp; Daily Attendance Check-in
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;
                    text-align:right;border-bottom:1px solid #f1f5f9;">+1</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9;background:#fafafa;">
                  &#128241;&nbsp; Daily App Login
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;
                    text-align:right;border-bottom:1px solid #f1f5f9;background:#fafafa;">+1</td>
              </tr>
              <tr>
                <td style="padding:8px 16px;font-size:13px;color:#374151;">
                  &#9878;&nbsp; Weight Tracker Update (once/week)
                </td>
                <td style="padding:8px 16px;font-size:13px;font-weight:700;color:#d97706;text-align:right;">+2</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HOW TO REDEEM -->
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

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 28px;text-align:center;
                     border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <a href="https://progym.co.in"
               style="display:inline-block;background:#0f172a;color:#ffffff;
                      font-size:13px;font-weight:700;text-decoration:none;
                      padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">
              &#128274;&nbsp; View My ProCoins
            </a>
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
