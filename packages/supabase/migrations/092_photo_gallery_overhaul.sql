-- =====================
-- Migration 092: Photo Gallery Overhaul
-- Adds photo comments, photo booth frames, and profile photo frames
-- =====================

-- =====================
-- 1. Add comments_count to event_photos
-- =====================
ALTER TABLE public.event_photos
  ADD COLUMN comments_count integer NOT NULL DEFAULT 0;

-- =====================
-- 2. photo_comments — comments on event photos
-- =====================
CREATE TABLE public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL CHECK (char_length(content) <= 140),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_comments_photo_created ON public.photo_comments(photo_id, created_at);

GRANT SELECT ON public.photo_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.photo_comments TO authenticated;

ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments for published events"
  ON public.photo_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_photos p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.id = photo_id AND e.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can insert comments"
  ON public.photo_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.photo_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can delete any comment"
  ON public.photo_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_photos p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.id = photo_id AND public.is_org_member(e.organization_id)
    )
  );

-- Trigger function to maintain comments_count (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.update_photo_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_photos SET comments_count = comments_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.event_photos SET comments_count = comments_count - 1 WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_photo_comments_count
  AFTER INSERT OR DELETE ON public.photo_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_photo_comments_count();

-- =====================
-- 3. photo_booth_frames — decorative frames for event photos
-- =====================
CREATE TABLE public.photo_booth_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) <= 40),
  color text NOT NULL DEFAULT '#3B82F6',
  template text NOT NULL CHECK (template IN ('banner_top', 'banner_bottom', 'corner', 'border')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_booth_frames_event_sort ON public.photo_booth_frames(event_id, sort_order);

GRANT SELECT ON public.photo_booth_frames TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_booth_frames TO authenticated;

ALTER TABLE public.photo_booth_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view frames for published events"
  ON public.photo_booth_frames FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Org members can view all frames"
  ON public.photo_booth_frames FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

CREATE POLICY "Org members can insert frames"
  ON public.photo_booth_frames FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

CREATE POLICY "Org members can update frames"
  ON public.photo_booth_frames FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

CREATE POLICY "Org members can delete frames"
  ON public.photo_booth_frames FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 4. Add frame_id to event_photos (FK to photo_booth_frames)
-- =====================
ALTER TABLE public.event_photos
  ADD COLUMN frame_id uuid REFERENCES public.photo_booth_frames(id) ON DELETE SET NULL;

-- =====================
-- 5. profile_photo_frames — frames for attendee profile photos
-- =====================
CREATE TABLE public.profile_photo_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) <= 12),
  color text NOT NULL DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_photo_frames_event_sort ON public.profile_photo_frames(event_id, sort_order);

GRANT SELECT ON public.profile_photo_frames TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_photo_frames TO authenticated;

ALTER TABLE public.profile_photo_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profile frames for published events"
  ON public.profile_photo_frames FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Org members can view all profile frames"
  ON public.profile_photo_frames FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

CREATE POLICY "Org members can insert profile frames"
  ON public.profile_photo_frames FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

CREATE POLICY "Org members can update profile frames"
  ON public.profile_photo_frames FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

CREATE POLICY "Org members can delete profile frames"
  ON public.profile_photo_frames FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 6. Add profile_frame_id to attendee_profiles
-- =====================
ALTER TABLE public.attendee_profiles
  ADD COLUMN profile_frame_id uuid REFERENCES public.profile_photo_frames(id) ON DELETE SET NULL;
