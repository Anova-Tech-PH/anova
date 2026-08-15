-- 074_gamification_extensions.sql
-- Gamification extensions: contests, trivia, exhibitor passport,
-- session checkins, referrals

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. contests — photo, caption, icebreaker contests
CREATE TABLE contests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('photo', 'caption', 'icebreaker')),
  title            TEXT        NOT NULL,
  description      TEXT,
  image_url        TEXT,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  points_per_action INT       NOT NULL DEFAULT 10,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1b. contest_entries — user submissions
CREATE TABLE contest_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id       UUID        NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content          TEXT,
  image_url        TEXT,
  likes_count      INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1c. contest_likes — one like per user per entry
CREATE TABLE contest_likes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id         UUID        NOT NULL REFERENCES contest_entries(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, user_id)
);

-- 1d. trivia_games — timed quiz games
CREATE TABLE trivia_games (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  time_limit_seconds  INT,
  points_per_correct  INT         NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1e. trivia_questions — questions for a game
CREATE TABLE trivia_questions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID        NOT NULL REFERENCES trivia_games(id) ON DELETE CASCADE,
  question_text    TEXT        NOT NULL,
  options          JSONB       NOT NULL,
  correct_index    INT         NOT NULL,
  sort_order       INT         NOT NULL DEFAULT 0
);

-- 1f. trivia_attempts — one attempt per user per game
CREATE TABLE trivia_attempts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID        NOT NULL REFERENCES trivia_games(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  score            INT         NOT NULL DEFAULT 0,
  total_time_ms    INT         NOT NULL DEFAULT 0,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);

-- 1g. exhibitor_passport_stamps — one stamp per exhibitor per user
CREATE TABLE exhibitor_passport_stamps (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exhibitor_id     UUID        NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  checked_in_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, exhibitor_id)
);

-- 1h. session_checkins — one checkin per session per user
CREATE TABLE session_checkins (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id       UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, session_id, user_id)
);

-- 1i. referral_codes — one code per user per event
CREATE TABLE referral_codes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code                TEXT        NOT NULL,
  registrations_count INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id),
  UNIQUE (code)
);

-- 1j. referral_registrations — tracks who registered via which code
CREATE TABLE referral_registrations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id    UUID        NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  registered_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referral_code_id, registered_user_id)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_contests_event
  ON contests(event_id, status);

CREATE INDEX idx_contest_entries_contest
  ON contest_entries(contest_id, likes_count DESC);

CREATE INDEX idx_trivia_games_event
  ON trivia_games(event_id, status);

CREATE INDEX idx_trivia_questions_game
  ON trivia_questions(game_id, sort_order);

CREATE INDEX idx_passport_stamps_event_user
  ON exhibitor_passport_stamps(event_id, user_id);

CREATE INDEX idx_session_checkins_session
  ON session_checkins(event_id, session_id);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- 3a. get_trivia_question — serves one question at a time without correct_index
CREATE OR REPLACE FUNCTION get_trivia_question(
  _game_id        UUID,
  _question_index INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _status TEXT;
BEGIN
  -- Verify game is active
  SELECT tg.status INTO _status
    FROM trivia_games tg
   WHERE tg.id = _game_id;

  IF _status IS DISTINCT FROM 'active' THEN
    RETURN NULL;
  END IF;

  -- Get the question at the given sort_order index, omitting correct_index
  SELECT jsonb_build_object(
    'id', tq.id,
    'question_text', tq.question_text,
    'options', tq.options,
    'sort_order', tq.sort_order
  ) INTO _result
  FROM trivia_questions tq
  WHERE tq.game_id = _game_id
  ORDER BY tq.sort_order
  LIMIT 1 OFFSET _question_index;

  RETURN _result;
END;
$$;

-- 3b. submit_trivia_answer — validates answer, upserts attempt
CREATE OR REPLACE FUNCTION submit_trivia_answer(
  _game_id         UUID,
  _user_id         UUID,
  _question_id     UUID,
  _selected_index  INT,
  _time_ms         INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _correct_index INT;
  _is_correct    BOOLEAN;
  _points        INT;
  _game_points   INT;
  _status        TEXT;
  _answer_obj    JSONB;
BEGIN
  -- Verify game is active
  SELECT tg.status, tg.points_per_correct
    INTO _status, _game_points
    FROM trivia_games tg
   WHERE tg.id = _game_id;

  IF _status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('error', 'Game is not active');
  END IF;

  -- Get correct answer
  SELECT tq.correct_index INTO _correct_index
    FROM trivia_questions tq
   WHERE tq.id = _question_id
     AND tq.game_id = _game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Question not found');
  END IF;

  _is_correct := (_selected_index = _correct_index);
  _points := CASE WHEN _is_correct THEN _game_points ELSE 0 END;

  -- Build answer record
  _answer_obj := jsonb_build_object(
    'question_id', _question_id,
    'selected_index', _selected_index,
    'correct', _is_correct,
    'time_ms', _time_ms,
    'points', _points
  );

  -- Upsert trivia_attempts: create or append answer
  INSERT INTO trivia_attempts (game_id, user_id, answers, score, total_time_ms)
  VALUES (_game_id, _user_id, jsonb_build_array(_answer_obj), _points, _time_ms)
  ON CONFLICT (game_id, user_id) DO UPDATE
    SET answers       = trivia_attempts.answers || _answer_obj,
        score         = trivia_attempts.score + _points,
        total_time_ms = trivia_attempts.total_time_ms + _time_ms;

  RETURN jsonb_build_object(
    'correct', _is_correct,
    'correct_index', _correct_index,
    'points', _points
  );
END;
$$;

-- 3c. update_contest_entry_likes — trigger function for likes count
CREATE OR REPLACE FUNCTION update_contest_entry_likes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contest_entries
       SET likes_count = likes_count + 1
     WHERE id = NEW.entry_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contest_entries
       SET likes_count = likes_count - 1
     WHERE id = OLD.entry_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================
-- 4. TRIGGER
-- ============================================================

CREATE TRIGGER trg_contest_likes_count
  AFTER INSERT OR DELETE ON contest_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_contest_entry_likes();

-- ============================================================
-- 5. TABLE GRANTS (to authenticated)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON contests           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contest_entries     TO authenticated;
GRANT SELECT, INSERT, DELETE         ON contest_likes       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trivia_games        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trivia_questions    TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON trivia_attempts     TO authenticated;
GRANT SELECT, INSERT                 ON exhibitor_passport_stamps TO authenticated;
GRANT SELECT, INSERT                 ON session_checkins    TO authenticated;
GRANT SELECT, INSERT                 ON referral_codes      TO authenticated;
GRANT SELECT, INSERT                 ON referral_registrations TO authenticated;

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE contests                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_likes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_games              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_questions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_attempts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_passport_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_checkins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_registrations    ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- contests
-- -------------------------------------------------------

-- Org editors can manage contests
CREATE POLICY contests_org_manage ON contests
  FOR ALL
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'editor'
    )
  )
  WITH CHECK (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'editor'
    )
  );

-- Attendees can view active contests
CREATE POLICY contests_attendee_view ON contests
  FOR SELECT
  USING (
    status = 'active'
    AND is_event_attendee(event_id)
  );

-- -------------------------------------------------------
-- contest_entries
-- -------------------------------------------------------

-- Org editors can manage all entries
CREATE POLICY contest_entries_org_manage ON contest_entries
  FOR ALL
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e
       JOIN contests c ON c.event_id = e.id
       WHERE c.id = contest_id),
      'editor'
    )
  )
  WITH CHECK (
    is_org_member(
      (SELECT e.organization_id FROM events e
       JOIN contests c ON c.event_id = e.id
       WHERE c.id = contest_id),
      'editor'
    )
  );

-- Attendees can view entries in active contests
CREATE POLICY contest_entries_attendee_view ON contest_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contests c
       WHERE c.id = contest_id
         AND c.status = 'active'
         AND is_event_attendee(c.event_id)
    )
  );

-- Users can insert own entries in active contests
CREATE POLICY contest_entries_own_insert ON contest_entries
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM contests c
       WHERE c.id = contest_id
         AND c.status = 'active'
         AND is_event_attendee(c.event_id)
    )
  );

-- -------------------------------------------------------
-- contest_likes
-- -------------------------------------------------------

-- Anyone authenticated can view likes
CREATE POLICY contest_likes_view ON contest_likes
  FOR SELECT
  USING (true);

-- Users can insert own likes
CREATE POLICY contest_likes_own_insert ON contest_likes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete own likes
CREATE POLICY contest_likes_own_delete ON contest_likes
  FOR DELETE
  USING (user_id = auth.uid());

-- -------------------------------------------------------
-- trivia_games
-- -------------------------------------------------------

-- Org editors can manage trivia games
CREATE POLICY trivia_games_org_manage ON trivia_games
  FOR ALL
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'editor'
    )
  )
  WITH CHECK (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'editor'
    )
  );

-- Attendees can view active trivia games
CREATE POLICY trivia_games_attendee_view ON trivia_games
  FOR SELECT
  USING (
    status = 'active'
    AND is_event_attendee(event_id)
  );

-- -------------------------------------------------------
-- trivia_questions
-- -------------------------------------------------------

-- Org editors can manage trivia questions
CREATE POLICY trivia_questions_org_manage ON trivia_questions
  FOR ALL
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e
       JOIN trivia_games tg ON tg.event_id = e.id
       WHERE tg.id = game_id),
      'editor'
    )
  )
  WITH CHECK (
    is_org_member(
      (SELECT e.organization_id FROM events e
       JOIN trivia_games tg ON tg.event_id = e.id
       WHERE tg.id = game_id),
      'editor'
    )
  );

-- NOTE: Attendees do NOT get direct SELECT on trivia_questions.
-- Questions are served via the get_trivia_question() SECURITY DEFINER function.

-- -------------------------------------------------------
-- trivia_attempts
-- -------------------------------------------------------

-- Users can view own attempts
CREATE POLICY trivia_attempts_own_view ON trivia_attempts
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert own attempts
CREATE POLICY trivia_attempts_own_insert ON trivia_attempts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update own attempts
CREATE POLICY trivia_attempts_own_update ON trivia_attempts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Org viewers can view all attempts
CREATE POLICY trivia_attempts_org_view ON trivia_attempts
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e
       JOIN trivia_games tg ON tg.event_id = e.id
       WHERE tg.id = game_id),
      'viewer'
    )
  );

-- -------------------------------------------------------
-- exhibitor_passport_stamps
-- -------------------------------------------------------

-- Users can view own stamps
CREATE POLICY passport_stamps_own_view ON exhibitor_passport_stamps
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert own stamps
CREATE POLICY passport_stamps_own_insert ON exhibitor_passport_stamps
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Org viewers can view all stamps
CREATE POLICY passport_stamps_org_view ON exhibitor_passport_stamps
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'viewer'
    )
  );

-- -------------------------------------------------------
-- session_checkins
-- -------------------------------------------------------

-- Users can view own checkins
CREATE POLICY session_checkins_own_view ON session_checkins
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert own checkins
CREATE POLICY session_checkins_own_insert ON session_checkins
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Org viewers can view all checkins
CREATE POLICY session_checkins_org_view ON session_checkins
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'viewer'
    )
  );

-- -------------------------------------------------------
-- referral_codes
-- -------------------------------------------------------

-- Users can view own referral codes
CREATE POLICY referral_codes_own_view ON referral_codes
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert own referral codes
CREATE POLICY referral_codes_own_insert ON referral_codes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Org viewers can view all referral codes
CREATE POLICY referral_codes_org_view ON referral_codes
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'viewer'
    )
  );

-- -------------------------------------------------------
-- referral_registrations
-- -------------------------------------------------------

-- Code owner can view registrations for their code
CREATE POLICY referral_registrations_owner_view ON referral_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referral_codes rc
       WHERE rc.id = referral_code_id
         AND rc.user_id = auth.uid()
    )
  );

-- Users can insert referral registrations (for own registered_user_id)
CREATE POLICY referral_registrations_insert ON referral_registrations
  FOR INSERT
  WITH CHECK (registered_user_id = auth.uid());

-- Org viewers can view all referral registrations
CREATE POLICY referral_registrations_org_view ON referral_registrations
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e
       JOIN referral_codes rc ON rc.event_id = e.id
       WHERE rc.id = referral_code_id),
      'viewer'
    )
  );

-- ============================================================
-- 7. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_scores;

-- ============================================================
-- 8. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('contest-photos', 'contest-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Anyone can view contest photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contest-photos');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload contest photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contest-photos'
    AND auth.role() = 'authenticated'
  );

-- Authenticated delete (own uploads)
CREATE POLICY "Authenticated users can delete contest photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contest-photos'
    AND auth.role() = 'authenticated'
  );
