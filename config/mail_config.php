<?php
// ── Gmail SMTP credentials ────────────────────────────────────────────────────
// IMPORTANT: Use a Gmail App Password here, NOT your regular Gmail password.
// Regular passwords are blocked by Google for SMTP since 2022.
// To generate an App Password:
//   1. Go to myaccount.google.com → Security → 2-Step Verification (enable first)
//   2. Then go to App Passwords → Select "Mail" → Generate
//   3. Paste the 16-character password below (spaces don't matter)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'progymkop@gmail.com');
define('SMTP_PASS', 'inms rcjp icji issm');          // ← replace with your 16-char App Password

// ── Display name (shown as sender in inbox) ───────────────────────────────────
define('MAIL_FROM_NAME', 'Pro Gym Kolhapur');

// ── Gym details (appear in every payment email) ───────────────────────────────
define('GYM_NAME',     'Pro Gym');
define('GYM_CITY',     'Kolhapur');
define('GYM_PHONE1',   '8796655176');
define('GYM_PHONE2',   '0231-2950426');
define('GYM_LOGO_URL', 'https://tavrostechinfo.com/PROGYM/brand/login_brand_logo.jpg');
define('GYM_WHATSAPP', '918796655176');   // country code + number, no spaces or +

// ── Developer footer ──────────────────────────────────────────────────────────
define('DEV_NAME',     'Prashant Bhat');
define('DEV_MOBILE',   '');              // 10-digit, e.g. 9876543210
define('DEV_WHATSAPP', '');             // with country code, e.g. 919876543210
define('DEV_EMAIL',    'bhatprashant1994@gmail.com');
