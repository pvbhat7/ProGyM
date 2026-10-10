-- =========================================================================
-- ai_log — every AI Search question (Admin Dashboard), for the daily cap,
-- cost tracking and reviewing answer quality.
-- Additive — safe on the live DB. Rollback: DROP TABLE ai_log;
-- =========================================================================

CREATE TABLE IF NOT EXISTS `ai_log` (
    `id`            INT NOT NULL AUTO_INCREMENT,
    `admin_mobile`  VARCHAR(20)  DEFAULT NULL,
    `question`      TEXT         NOT NULL,
    `answer`        TEXT         DEFAULT NULL,
    `tools`         VARCHAR(500) DEFAULT NULL,
    `records`       INT          DEFAULT NULL,
    `model`         VARCHAR(80)  DEFAULT NULL,
    `input_tokens`  INT          DEFAULT NULL,
    `output_tokens` INT          DEFAULT NULL,
    `ms`            INT          DEFAULT NULL,
    `status`        VARCHAR(20)  NOT NULL DEFAULT 'ok',
    `error`         VARCHAR(500) DEFAULT NULL,
    `created_at`    DATETIME     NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_ai_log_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
