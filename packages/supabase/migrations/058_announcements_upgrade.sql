-- Migration 058: Announcements upgrade - sender fields + templates
-- Creates announcements table if missing (from 030), adds new sender columns,
-- and creates announcement_templates table with RLS.

-- 0. Create announcements table if it doesn't exist (was defined in 030 but may not be applied)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  channels TEXT[] NOT NULL DEFAULT '{in_app}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- Indexes for announcements (idempotent)
CREATE INDEX IF NOT EXISTS idx_announcements_event ON public.announcements(event_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);

-- 1. Add new columns to announcements
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_email TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT;

-- 2. Create announcement_templates table
CREATE TABLE IF NOT EXISTS announcement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('quick_reminder', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE announcement_templates ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON announcement_templates TO authenticated;

-- 5. RLS policy: org members can manage templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcement_templates' AND policyname = 'Org members can manage templates'
  ) THEN
    CREATE POLICY "Org members can manage templates"
      ON announcement_templates
      FOR ALL
      USING (is_org_member(organization_id));
  END IF;
END
$$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_announcement_templates_organization_id
  ON announcement_templates(organization_id);

CREATE INDEX IF NOT EXISTS idx_announcement_templates_event_id
  ON announcement_templates(event_id);
