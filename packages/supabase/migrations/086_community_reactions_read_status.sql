-- Community post reactions (emoji reactions like Whova's 👍❤🤣)
CREATE TABLE IF NOT EXISTS public.community_post_reactions (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji IN ('👍', '❤', '🤣')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, post_id, emoji)
);

ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.community_post_reactions TO authenticated;
GRANT SELECT ON public.community_post_reactions TO anon;

CREATE INDEX idx_community_post_reactions_post ON public.community_post_reactions(post_id);

CREATE POLICY "Anyone can view reactions"
  ON public.community_post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.community_post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON public.community_post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Community topic read status (tracks when user last read a topic)
CREATE TABLE IF NOT EXISTS public.community_topic_read_status (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id   uuid NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

ALTER TABLE public.community_topic_read_status ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.community_topic_read_status TO authenticated;

CREATE INDEX idx_community_topic_read_status_user ON public.community_topic_read_status(user_id);

CREATE POLICY "Users manage own read status"
  ON public.community_topic_read_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
