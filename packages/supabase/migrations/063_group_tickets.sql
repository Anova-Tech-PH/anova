-- Migration 063: Group tickets support
ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS group_size INT DEFAULT 1;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS is_group_child BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_registrations_parent
  ON public.registrations(parent_registration_id)
  WHERE parent_registration_id IS NOT NULL;
