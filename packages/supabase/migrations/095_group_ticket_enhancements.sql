-- Migration 095: Group ticket enhancements
-- Add min/max per order for group tickets (matches Whova's group ticket form)
ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS min_per_order INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_per_order INT;
