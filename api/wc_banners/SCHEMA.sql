-- =========================================================================
-- Sponsored banners shown at the bottom of the wc2026 Matches page.
-- Run ONCE in phpMyAdmin against u636480992_ggs.
-- =========================================================================

CREATE TABLE IF NOT EXISTS `wc_banners` (
    `id`            INT NOT NULL AUTO_INCREMENT,
    `image_url`     VARCHAR(500) NOT NULL,
    `sponsor_name`  VARCHAR(100) DEFAULT NULL,
    `link_url`      VARCHAR(500) DEFAULT NULL,
    `display_order` INT          DEFAULT 0,
    `is_active`     VARCHAR(10)  NOT NULL DEFAULT 'yes',
    `created_at`    DATETIME     DEFAULT NULL,
    `updated_at`    DATETIME     DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_active_order` (`is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
