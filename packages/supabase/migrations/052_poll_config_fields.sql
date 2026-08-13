-- Add configuration fields to live_polls matching Whova's poll creation options
ALTER TABLE public.live_polls
  ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN prompt_attendee BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN result_visibility TEXT NOT NULL DEFAULT 'everyone'
    CHECK (result_visibility IN ('everyone', 'after_closed', 'organizers_only'));
