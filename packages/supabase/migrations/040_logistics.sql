-- =============================================================================
-- Logistics Page
-- Extends events table with venue details and logistics JSONB config
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_description TEXT,
  ADD COLUMN IF NOT EXISTS venue_map_url TEXT,
  ADD COLUMN IF NOT EXISTS logistics JSONB NOT NULL DEFAULT '{}';
