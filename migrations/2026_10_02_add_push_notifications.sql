-- =========================================================================
-- ProGym web push (FCM) — admin broadcast notifications.
--
-- Run ONCE in phpMyAdmin against `u636480992_ggs` BEFORE uploading the
-- new PHP files (userNotifications/byClientId.php selects image + link).
--
--   * push_tokens      — one row per browser/device that allowed notifications.
--                        `token` is UNIQUE; latest member to log in on a device
--                        owns its token (ON DUPLICATE KEY UPDATE).
--   * push_broadcasts  — history of admin-sent notifications + delivery stats.
--   * user_notifications gains `image` + `link` so the in-app bell can show
--     the same picture/link as the push (and reaches members without push).
-- =========================================================================

CREATE TABLE IF NOT EXISTS `push_tokens` (
    `id`           INT NOT NULL AUTO_INCREMENT,
    `client_id`    INT NOT NULL,
    `token`        VARCHAR(512) NOT NULL,
    `user_agent`   VARCHAR(255) DEFAULT NULL,
    `created_at`   DATETIME     DEFAULT NULL,
    `last_seen_at` DATETIME     DEFAULT NULL,
    `is_active`    VARCHAR(10)  NOT NULL DEFAULT 'yes',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_token` (`token`),
    KEY `idx_client_active` (`client_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS `push_broadcasts` (
    `id`             INT NOT NULL AUTO_INCREMENT,
    `title`          VARCHAR(120) NOT NULL,
    `message`        VARCHAR(500) NOT NULL,
    `image`          VARCHAR(500) DEFAULT NULL,
    `link`           VARCHAR(500) DEFAULT NULL,
    `audience`       VARCHAR(30)  NOT NULL,
    `audience_value` VARCHAR(50)  DEFAULT NULL,
    `recipients`     INT NOT NULL DEFAULT 0,
    `devices`        INT NOT NULL DEFAULT 0,
    `push_sent`      INT NOT NULL DEFAULT 0,
    `push_failed`    INT NOT NULL DEFAULT 0,
    `created_by`     VARCHAR(50)  DEFAULT NULL,
    `created_at`     DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `user_notifications`
    ADD COLUMN `image` VARCHAR(500) DEFAULT NULL,
    ADD COLUMN `link`  VARCHAR(500) DEFAULT NULL;
