-- =============================================================================
-- Migration 088: Poll Answer Types
-- Adds answer_type to live_polls, extends live_poll_votes for non-choice types
-- =============================================================================

-- 1. Add answer_type to live_polls
ALTER TABLE public.live_polls
  ADD COLUMN answer_type TEXT NOT NULL DEFAULT 'multiple_choice'
  CHECK (answer_type IN ('multiple_choice', 'checkbox', 'short_answer', 'star_rating', 'word_cloud'));

-- 2. Restructure live_poll_votes for multi-vote (checkbox) and non-choice types
-- Drop composite PK, add UUID PK
ALTER TABLE public.live_poll_votes
  DROP CONSTRAINT live_poll_votes_pkey;

ALTER TABLE public.live_poll_votes
  ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- Backfill IDs for existing rows
UPDATE public.live_poll_votes SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.live_poll_votes
  ALTER COLUMN id SET NOT NULL,
  ADD PRIMARY KEY (id);

-- Make option_id nullable (unused for non-choice types)
ALTER TABLE public.live_poll_votes
  ALTER COLUMN option_id DROP NOT NULL;

-- Add response columns for non-choice types
ALTER TABLE public.live_poll_votes
  ADD COLUMN response_text TEXT,
  ADD COLUMN rating_value INT CHECK (rating_value >= 1 AND rating_value <= 5);

-- Partial unique indexes to enforce constraints per type:
-- For choice types: one vote per option per user (allows multiple options for checkbox)
CREATE UNIQUE INDEX idx_poll_votes_choice
  ON public.live_poll_votes (poll_id, user_id, option_id)
  WHERE option_id IS NOT NULL;

-- For non-choice types: one response per user
CREATE UNIQUE INDEX idx_poll_votes_response
  ON public.live_poll_votes (poll_id, user_id)
  WHERE option_id IS NULL;
