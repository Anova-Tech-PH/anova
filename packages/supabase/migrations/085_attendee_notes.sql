-- Attendee notes (like speaker_notes pattern)
CREATE TABLE IF NOT EXISTS public.attendee_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (target_user_id, user_id)
);

ALTER TABLE public.attendee_notes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_notes TO authenticated;

CREATE POLICY "Users manage own attendee notes"
  ON public.attendee_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_attendee_notes_user ON public.attendee_notes(user_id);
