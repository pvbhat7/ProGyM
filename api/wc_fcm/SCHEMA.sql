-- =========================================================================
-- Schema for wc2026 web-push (FCM) notifications.
--
-- Run ONCE in phpMyAdmin against the `u636480992_ggs` database.
--
-- Design notes:
--   * `wc_fcm_tokens.token` is UNIQUE — on every login we do
--     INSERT ... ON DUPLICATE KEY UPDATE so the LATEST user to log in on
--     a device wins the token. Previous user's claim is overwritten.
--   * `wc_notifications_log.event_key` is UNIQUE so we can do a safe
--     "INSERT IGNORE" before sending and never duplicate (cron retries,
--     race between settle + reminder, etc.).
-- =========================================================================

CREATE TABLE IF NOT EXISTS `wc_fcm_tokens` (
    `id`           INT NOT NULL AUTO_INCREMENT,
    `client_id`    INT NOT NULL,
    `token`        VARCHAR(512) NOT NULL,
    `platform`     VARCHAR(20)  DEFAULT 'web',
    `user_agent`   VARCHAR(255) DEFAULT NULL,
    `created_at`   DATETIME     DEFAULT NULL,
    `last_seen_at` DATETIME     DEFAULT NULL,
    `is_active`    VARCHAR(10)  NOT NULL DEFAULT 'yes',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_token` (`token`),
    KEY `idx_client_active` (`client_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS `wc_notifications_log` (
    `id`         INT NOT NULL AUTO_INCREMENT,
    `event_key`  VARCHAR(120) NOT NULL,
    `event_type` VARCHAR(50)  NOT NULL,
    `client_id`  INT          NOT NULL,
    `token`      VARCHAR(512) DEFAULT NULL,
    `title`      VARCHAR(120) DEFAULT NULL,
    `body`       VARCHAR(255) DEFAULT NULL,
    `payload`    TEXT         DEFAULT NULL,
    `fcm_status` VARCHAR(30)  DEFAULT NULL,
    `error_msg`  VARCHAR(255) DEFAULT NULL,
    `sent_at`    DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_event_key` (`event_key`),
    KEY `idx_client_event` (`client_id`, `event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
