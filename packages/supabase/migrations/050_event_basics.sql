-- =============================================================================
-- Event Basics - Whova Parity
-- Adds comprehensive event information fields matching Whova's Basics page
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS max_attendees INT,
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS airport_ride_sharing TEXT NOT NULL DEFAULT 'none'
    CHECK (airport_ride_sharing IN ('enabled', 'provided', 'none')),
  ADD COLUMN IF NOT EXISTS event_website_url TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS twitter_hashtags TEXT,
  ADD COLUMN IF NOT EXISTS post_event_summary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generate_interests BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS attendee_origin TEXT
    CHECK (attendee_origin IS NULL OR attendee_origin IN ('local', 'national', 'global')),
  ADD COLUMN IF NOT EXISTS topic_tags JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS organization_type JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS event_type_other TEXT,
  ADD COLUMN IF NOT EXISTS location_data JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.events.abbreviation IS 'Short name for compact displays (max 30 chars)';
COMMENT ON COLUMN public.events.location_data IS 'Structured location from Google Places: {place_id, formatted_address, venue_name, city, state, zip, country, lat, lng}';
COMMENT ON COLUMN public.events.topic_tags IS 'JSON array of topic tag strings';
COMMENT ON COLUMN public.events.organization_type IS 'JSON array of org type strings: association, nonprofit, government, corporate, university, other';
