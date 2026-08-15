<?php
/**
 * License client configuration for the gym app.
 * Copy this file to config.php on the server and fill in real values.
 * config.php is gitignored — never commit real client_code / contact info.
 */
return [
    // Unique per-client identifier — get from license admin after creating
    // the gym client at license.tavrostechinfo.com/admin/.
    'client_code' => 'GYM-XXXXXX',

    'server_url'      => 'https://license.tavrostechinfo.com/api/check.php',
    'public_key_path' => __DIR__ . '/public.pem',

    // Vendor contact shown on the lock overlay when the app is locked.
    'contact_name'  => 'Vinayak Bhat',
    'contact_phone' => '+91-XXXXXXXXXX',
    'contact_email' => 'tavrostech.info@gmail.com',

    // How long a signed response stays "fresh" before we refetch.
    'cache_ttl_seconds' => 3600,

    // How long we tolerate the license server being unreachable while still
    // allowing the app to run on the last valid cached response. After this
    // window elapses with no successful fetch, the app locks.
    'offline_tolerance_seconds' => 7 * 86400,
];
