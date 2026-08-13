-- Add Open Time configuration to live_polls
-- open_time_mode: 'now' (open immediately), 'before_session' (offset), 'scheduled' (specific date/time)
-- open_before_minutes: minutes before session start to auto-open (for 'before_session' mode)
-- scheduled_open_at: specific datetime to open (for 'scheduled' mode)
ALTER TABLE public.live_polls
  ADD COLUMN open_time_mode TEXT NOT NULL DEFAULT 'now'
    CHECK (open_time_mode IN ('now', 'before_session', 'scheduled')),
  ADD COLUMN open_before_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN scheduled_open_at TIMESTAMPTZ;
