-- AI Diet Plans (admin generates with AI, reviews/edits, then assigns to a member).
-- One 'active' plan per member; saving a new one archives the previous.
CREATE TABLE IF NOT EXISTS ai_diet_plan (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id   INT NOT NULL,
  title       VARCHAR(150) NOT NULL,
  inputs      LONGTEXT NULL,          -- JSON: form inputs used to generate (goal, diet type, weight…)
  plan        LONGTEXT NOT NULL,      -- JSON: {summary, targets, meals[], tips[]}
  status      VARCHAR(20) NOT NULL DEFAULT 'active',   -- active | archived
  created_by  VARCHAR(15) NULL,       -- admin mobile
  model       VARCHAR(60) NULL,
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  KEY idx_ai_diet_client (client_id, status),
  KEY idx_ai_diet_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
