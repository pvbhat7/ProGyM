-- =========================================================================
-- client.googleUid — Firebase uid of the member's Google sign-in.
--
-- Read/written by client/byGoogleUid.php, client/linkGoogleUid.php and the new
-- self sign-up (client/createSelfSignup.php). The column never existed, so
-- Google login silently fell back to email matching and linking was a no-op.
--
-- Additive + nullable — safe to run on the live DB. Rollback:
--   ALTER TABLE client DROP INDEX idx_client_googleUid, DROP COLUMN googleUid;
-- =========================================================================

ALTER TABLE `client`
    ADD COLUMN `googleUid` VARCHAR(128) NULL DEFAULT NULL,
    ADD INDEX `idx_client_googleUid` (`googleUid`);
