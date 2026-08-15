-- Session likes (heart/like a session)
CREATE TABLE public.session_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE public.session_likes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.session_likes TO authenticated;
GRANT SELECT ON public.session_likes TO anon;

CREATE POLICY "Anyone can view session likes"
  ON public.session_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like sessions"
  ON public.session_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike sessions"
  ON public.session_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Session chat messages (real-time discussion per session)
CREATE TABLE public.session_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.session_chat_messages TO authenticated;
GRANT SELECT ON public.session_chat_messages TO anon;

CREATE POLICY "Anyone can view session chat"
  ON public.session_chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can post chat messages"
  ON public.session_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_session_likes_session ON public.session_likes(session_id);
CREATE INDEX idx_session_chat_session ON public.session_chat_messages(session_id, created_at);
