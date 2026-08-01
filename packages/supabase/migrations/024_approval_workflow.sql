-- Feature 7: Approval Workflow
-- Add require_approval flag to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT false;
