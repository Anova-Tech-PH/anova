-- Add attendee profile fields to registrations table
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_registrations_category ON registrations (event_id, category);

-- Index for search (name, email)
CREATE INDEX IF NOT EXISTS idx_registrations_search ON registrations (event_id, name, email);
