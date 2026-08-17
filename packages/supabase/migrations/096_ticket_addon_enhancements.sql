-- Add limit_per_order and available_until columns to ticket_addons
ALTER TABLE public.ticket_addons
  ADD COLUMN IF NOT EXISTS limit_per_order INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;
