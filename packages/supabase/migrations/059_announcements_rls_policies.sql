-- Migration 059: Add RLS policies for announcements table
-- The announcements table had RLS enabled but no policies, blocking all operations.

-- Org members can view announcements for events in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Org members can view announcements'
  ) THEN
    CREATE POLICY "Org members can view announcements"
      ON announcements FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = announcements.event_id
          AND is_org_member(e.organization_id)
        )
      );
  END IF;
END $$;

-- Org members can create announcements for events in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Org members can create announcements'
  ) THEN
    CREATE POLICY "Org members can create announcements"
      ON announcements FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = announcements.event_id
          AND is_org_member(e.organization_id)
        )
      );
  END IF;
END $$;

-- Org members can update announcements for events in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Org members can update announcements'
  ) THEN
    CREATE POLICY "Org members can update announcements"
      ON announcements FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = announcements.event_id
          AND is_org_member(e.organization_id)
        )
      );
  END IF;
END $$;

-- Org members can delete announcements for events in their org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Org members can delete announcements'
  ) THEN
    CREATE POLICY "Org members can delete announcements"
      ON announcements FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = announcements.event_id
          AND is_org_member(e.organization_id)
        )
      );
  END IF;
END $$;

-- Also add RLS policies for announcement_reads (attendees mark their own reads)
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON announcement_reads TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcement_reads' AND policyname = 'Users can manage their own reads'
  ) THEN
    CREATE POLICY "Users can manage their own reads"
      ON announcement_reads FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
