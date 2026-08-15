-- Speaker bookmarks (like session_bookmarks pattern)
CREATE TABLE IF NOT EXISTS public.speaker_bookmarks (
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE,
  speaker_id uuid REFERENCES public.speakers ON DELETE CASCADE,
  event_id   uuid REFERENCES public.events ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, speaker_id)
);

ALTER TABLE public.speaker_bookmarks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.speaker_bookmarks TO authenticated;

CREATE POLICY "Users manage own speaker bookmarks"
  ON public.speaker_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_speaker_bookmarks_user_event ON public.speaker_bookmarks(user_id, event_id);

-- Speaker notes (like session_notes pattern)
CREATE TABLE IF NOT EXISTS public.speaker_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id uuid NOT NULL REFERENCES public.speakers ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content    text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (speaker_id, user_id)
);

ALTER TABLE public.speaker_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.speaker_notes TO authenticated;

CREATE POLICY "Users manage own speaker notes"
  ON public.speaker_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_speaker_notes_user ON public.speaker_notes(user_id);
