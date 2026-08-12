-- Migration 037: Speaker Enhancements
-- Add social links, featured flag, and sort order to speakers table

ALTER TABLE public.speakers
  ADD COLUMN linkedin_url TEXT,
  ADD COLUMN twitter_handle TEXT,
  ADD COLUMN website_url TEXT,
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_speakers_featured ON public.speakers(event_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_speakers_sort ON public.speakers(event_id, sort_order);
