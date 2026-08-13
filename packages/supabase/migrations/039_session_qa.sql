-- 039_session_qa.sql
-- Session Q&A: questions, upvotes, moderation, realtime

-- 1. Session-level toggles
ALTER TABLE public.sessions
  ADD COLUMN qa_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN qa_moderation_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN qa_anonymous_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2. session_questions table
CREATE TABLE public.session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'answered')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  upvote_count INT NOT NULL DEFAULT 0,
  answer_text TEXT,
  answered_by UUID REFERENCES auth.users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. question_upvotes table
CREATE TABLE public.question_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.session_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- 4. Indexes
CREATE INDEX idx_session_questions_session ON public.session_questions(session_id);
CREATE INDEX idx_session_questions_event ON public.session_questions(event_id);
CREATE INDEX idx_session_questions_status ON public.session_questions(session_id, status);
CREATE INDEX idx_question_upvotes_question ON public.question_upvotes(question_id);

-- 5. RLS + Grants

ALTER TABLE public.session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_upvotes ENABLE ROW LEVEL SECURITY;

-- Grants: session_questions
GRANT SELECT ON public.session_questions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.session_questions TO authenticated;
GRANT ALL ON public.session_questions TO service_role;

-- Grants: question_upvotes
GRANT SELECT, INSERT, DELETE ON public.question_upvotes TO authenticated;
GRANT ALL ON public.question_upvotes TO service_role;

-- Policies: session_questions

-- Anon: SELECT approved/answered questions for published events
CREATE POLICY "anon_select_approved_questions"
  ON public.session_questions FOR SELECT
  TO anon
  USING (
    status IN ('approved', 'answered')
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = session_questions.event_id
        AND events.status = 'published'
    )
  );

-- Authenticated SELECT: approved/answered OR own questions OR org members see all
CREATE POLICY "authenticated_select_questions"
  ON public.session_questions FOR SELECT
  TO authenticated
  USING (
    status IN ('approved', 'answered')
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = session_questions.event_id
        AND public.is_org_member(events.organization_id)
    )
  );

-- Authenticated INSERT: user_id must equal auth.uid()
CREATE POLICY "authenticated_insert_questions"
  ON public.session_questions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authenticated UPDATE: org members only (for moderation)
CREATE POLICY "authenticated_update_questions"
  ON public.session_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = session_questions.event_id
        AND public.is_org_member(events.organization_id)
    )
  );

-- Policies: question_upvotes

-- Users manage own upvotes
CREATE POLICY "authenticated_manage_own_upvotes"
  ON public.question_upvotes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone authenticated can SELECT (for counting)
CREATE POLICY "authenticated_select_upvotes"
  ON public.question_upvotes FOR SELECT
  TO authenticated
  USING (true);

-- 6. Upvote count trigger
CREATE OR REPLACE FUNCTION update_question_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE session_questions SET upvote_count = upvote_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE session_questions SET upvote_count = upvote_count - 1 WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_question_upvote_count
  AFTER INSERT OR DELETE ON public.question_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_question_upvote_count();

-- 7. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_questions;
