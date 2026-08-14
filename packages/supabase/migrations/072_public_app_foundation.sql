-- =====================
-- Migration 072: Public App Foundation
-- Core tables for the attendee-facing public app
-- =====================

-- =====================
-- 1. attendee_profiles — per-event attendee profile
-- =====================
CREATE TABLE public.attendee_profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) <= 100),
  avatar_url text,
  title text,
  company text,
  location text,
  bio text,
  is_visible_in_directory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, event_id)
);

CREATE INDEX idx_attendee_profiles_event ON public.attendee_profiles(event_id);
CREATE INDEX idx_attendee_profiles_visible ON public.attendee_profiles(event_id, is_visible_in_directory) WHERE is_visible_in_directory = true;

GRANT SELECT ON public.attendee_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_profiles TO authenticated;

ALTER TABLE public.attendee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visible profiles for published events"
  ON public.attendee_profiles FOR SELECT
  USING (
    is_visible_in_directory = true
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Users can view their own profile"
  ON public.attendee_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.attendee_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.attendee_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.attendee_profiles FOR DELETE
  USING (auth.uid() = id);

CREATE POLICY "Org members can view all profiles"
  ON public.attendee_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 2. direct_messages — private attendee messaging
-- =====================
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 5000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(event_id, sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(event_id, recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_created ON public.direct_messages(event_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- =====================
-- 3. community_topics — discussion board topics
-- =====================
CREATE TABLE public.community_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 200),
  type text NOT NULL DEFAULT 'discussion' CHECK (type IN ('discussion', 'announcement', 'meetup', 'ask_organizer')),
  description text,
  pinned boolean NOT NULL DEFAULT false,
  meetup_date timestamptz,
  meetup_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_topics_event ON public.community_topics(event_id, created_at DESC);
CREATE INDEX idx_community_topics_pinned ON public.community_topics(event_id, pinned DESC, created_at DESC);

GRANT SELECT ON public.community_topics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_topics TO authenticated;

ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topics for published events"
  ON public.community_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can create topics"
  ON public.community_topics FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own topics"
  ON public.community_topics FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own topics"
  ON public.community_topics FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Org members can manage all topics"
  ON public.community_topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 4. community_posts — topic replies
-- =====================
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_posts_topic ON public.community_posts(topic_id, created_at);

GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, DELETE ON public.community_posts TO authenticated;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts for published events"
  ON public.community_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_topics t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = topic_id AND e.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Org members can manage all posts"
  ON public.community_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_topics t
      JOIN public.events e ON e.id = t.event_id
      WHERE t.id = topic_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 5. community_topic_follows — follow/unfollow topics
-- =====================
CREATE TABLE public.community_topic_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

GRANT SELECT, INSERT, DELETE ON public.community_topic_follows TO authenticated;

ALTER TABLE public.community_topic_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON public.community_topic_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow topics"
  ON public.community_topic_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow topics"
  ON public.community_topic_follows FOR DELETE
  USING (auth.uid() = user_id);

-- =====================
-- 6. event_icebreakers — organizer-configured icebreaker questions
-- =====================
CREATE TABLE public.event_icebreakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) <= 500),
  options jsonb DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_icebreakers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_icebreakers TO authenticated;

ALTER TABLE public.event_icebreakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view icebreakers for published events"
  ON public.event_icebreakers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Org members can manage icebreakers"
  ON public.event_icebreakers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 7. icebreaker_responses — attendee responses to icebreaker
-- =====================
CREATE TABLE public.icebreaker_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  introduction text,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_icebreaker_responses_event ON public.icebreaker_responses(event_id);

GRANT SELECT, INSERT, UPDATE ON public.icebreaker_responses TO authenticated;

ALTER TABLE public.icebreaker_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view responses for published events"
  ON public.icebreaker_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Users can insert their own response"
  ON public.icebreaker_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own response"
  ON public.icebreaker_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- 8. event_photos — photo gallery
-- =====================
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  caption text,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event ON public.event_photos(event_id, created_at DESC);
CREATE INDEX idx_event_photos_user ON public.event_photos(event_id, user_id);

GRANT SELECT ON public.event_photos TO anon;
GRANT SELECT, INSERT, DELETE ON public.event_photos TO authenticated;

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view photos for published events"
  ON public.event_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Users can upload photos"
  ON public.event_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.event_photos FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can manage all photos"
  ON public.event_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 9. photo_likes — like tracking with trigger
-- =====================
CREATE TABLE public.photo_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id uuid NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, photo_id)
);

GRANT SELECT, INSERT, DELETE ON public.photo_likes TO authenticated;

ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes"
  ON public.photo_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_photos p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.id = photo_id AND e.status = 'published'
    )
  );

CREATE POLICY "Users can like photos"
  ON public.photo_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike photos"
  ON public.photo_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function to maintain likes_count (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.update_photo_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_photos SET likes_count = likes_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.event_photos SET likes_count = likes_count - 1 WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_photo_likes_count
  AFTER INSERT OR DELETE ON public.photo_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_photo_likes_count();

-- =====================
-- 10. session_notes — private per-session notes
-- =====================
CREATE TABLE public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_notes_user ON public.session_notes(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes TO authenticated;

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON public.session_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.session_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.session_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.session_notes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================
-- 11. attendee_bookmarks — bookmark other attendees
-- =====================
CREATE TABLE public.attendee_bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookmarked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bookmarked_user_id, event_id)
);

CREATE INDEX idx_attendee_bookmarks_user_event ON public.attendee_bookmarks(user_id, event_id);

GRANT SELECT, INSERT, DELETE ON public.attendee_bookmarks TO authenticated;

ALTER TABLE public.attendee_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON public.attendee_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
  ON public.attendee_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.attendee_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================
-- 12. activity_feed — event activity stream
-- =====================
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('announcement', 'photo', 'community_post', 'meetup')),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_feed_event ON public.activity_feed(event_id, created_at DESC);

GRANT SELECT ON public.activity_feed TO anon;
GRANT SELECT, INSERT ON public.activity_feed TO authenticated;

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity for published events"
  ON public.activity_feed FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Users can insert activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- Storage bucket: attendee-photos
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendee-photos', 'attendee-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view attendee photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attendee-photos');

CREATE POLICY "Authenticated users can upload attendee photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attendee-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own attendee photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attendee-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
