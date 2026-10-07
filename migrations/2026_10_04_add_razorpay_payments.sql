-- =========================================================================
-- Razorpay online payments (membership renewal + pending balance).
-- Run ONCE on `u636480992_ggs`.
--
--   kind      'checkout' = member paid in the app (Razorpay order)
--             'link'     = admin-generated payment link
--   purpose   'renew'    = new package; packagedetails row is created only after payment
--             'balance'  = pending balance on an existing packagedetails row
--   status    'created' → 'processing' → 'paid'   (or 'failed')
--
-- One row per Razorpay order/link. The status transition created→processing is
-- the idempotency lock: verify.php and webhook.php can both fire for the same
-- payment, but only one of them records it.
-- =========================================================================

CREATE TABLE IF NOT EXISTS `razorpay_payments` (
    `id`                   INT NOT NULL AUTO_INCREMENT,
    `kind`                 VARCHAR(10)   NOT NULL,
    `purpose`              VARCHAR(10)   NOT NULL,
    `clientId`             INT           NOT NULL,
    `packageId`            INT           DEFAULT NULL,
    `packageDetailsId`     INT           DEFAULT NULL,
    `amount`               DECIMAL(10,2) NOT NULL,
    `description`          VARCHAR(255)  DEFAULT NULL,
    `mode`                 VARCHAR(5)    NOT NULL,
    `rzpOrderId`           VARCHAR(40)   DEFAULT NULL,
    `rzpLinkId`            VARCHAR(40)   DEFAULT NULL,
    `rzpPaymentId`         VARCHAR(40)   DEFAULT NULL,
    `linkUrl`              VARCHAR(255)  DEFAULT NULL,
    `paymentMethod`        VARCHAR(30)   DEFAULT NULL,
    `status`               VARCHAR(12)   NOT NULL DEFAULT 'created',
    `paymentTransactionId` INT           DEFAULT NULL,
    `createdBy`            VARCHAR(10)   NOT NULL,
    `createdAt`            DATETIME      NOT NULL,
    `paidAt`               DATETIME      DEFAULT NULL,
    `error`                VARCHAR(255)  DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_order`   (`rzpOrderId`),
    UNIQUE KEY `uq_link`    (`rzpLinkId`),
    UNIQUE KEY `uq_payment` (`rzpPaymentId`),
    KEY `idx_client` (`clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
