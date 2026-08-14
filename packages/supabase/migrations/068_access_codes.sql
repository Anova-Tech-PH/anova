-- Migration 068: Access code for invite-only tickets

ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE INDEX IF NOT EXISTS idx_ticket_types_access_code
  ON public.ticket_types(event_id, access_code)
  WHERE access_code IS NOT NULL;
