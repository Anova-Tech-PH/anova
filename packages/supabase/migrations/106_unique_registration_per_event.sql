-- Prevent duplicate registrations: one registration per user per event
CREATE UNIQUE INDEX unique_user_event_registration
  ON public.registrations (user_id, event_id)
  WHERE user_id IS NOT NULL;
