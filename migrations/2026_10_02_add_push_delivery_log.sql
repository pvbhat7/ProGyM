-- =========================================================================
-- Per-device delivery log for admin push broadcasts.
-- Run ONCE on `u636480992_ggs` (after 2026_10_02_add_push_notifications.sql).
--
--   status        'sent'   = accepted by Firebase
--                 'failed' = rejected (error has the FCM code)
--   delivered_at  set when the device's service worker displayed it
--   clicked_at    set when the member tapped it
-- =========================================================================

CREATE TABLE IF NOT EXISTS `push_delivery_log` (
    `id`           INT NOT NULL AUTO_INCREMENT,
    `broadcast_id` INT NOT NULL,
    `token_id`     INT NOT NULL,
    `client_id`    INT NOT NULL,
    `status`       VARCHAR(10)  NOT NULL,
    `error`        VARCHAR(255) DEFAULT NULL,
    `sent_at`      DATETIME     DEFAULT NULL,
    `delivered_at` DATETIME     DEFAULT NULL,
    `clicked_at`   DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_broadcast_token` (`broadcast_id`, `token_id`),
    KEY `idx_token` (`token_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
