-- Private submissions database (Cloudflare D1, "cre-submissions").
-- Holds the full record including the submitter's email, which never goes in the public repo.
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,            -- same as the pending/ filename without .json
  tool_name TEXT NOT NULL,
  website TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT,
  description TEXT,
  pricing TEXT,
  submitter_name TEXT,
  relationship TEXT,
  notes TEXT,
  screenshot_urls TEXT,
  submitted_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web-form',
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | processed | rejected
  product_slug TEXT,
  processed_at TEXT,
  rejected_reason TEXT
);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions (status, submitted_at);
