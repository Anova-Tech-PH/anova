-- Drop unique constraint on event_id to allow multiple surveys
ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_event_id_key;

-- Add status column for survey lifecycle
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('draft', 'active', 'closed'));

-- Add description column
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS description TEXT;
