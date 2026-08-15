-- License cache table for the gym app.
-- Single-row table (id=1). Stores the last valid signed response from the
-- license server so the gym app can enforce license status without hitting
-- the license server on every request.
--
-- Tamper-evident: the RSA signature is over signed_payload_b64. Any edit
-- to signed_payload_b64 or signature invalidates it → verifier treats the
-- row as absent.

CREATE TABLE IF NOT EXISTS license_cache (
  id                     TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  signed_payload_b64     MEDIUMTEXT NOT NULL,
  signature              TEXT NOT NULL,
  key_version            INT UNSIGNED DEFAULT 1,
  cached_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_fetch_attempt_at  DATETIME DEFAULT NULL,
  last_fetch_error       VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
