-- 073_gamification.sql
-- Gamification: points, leaderboards, badges

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. gamification_configs — per-event settings
CREATE TABLE gamification_configs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  enabled        BOOLEAN     NOT NULL DEFAULT false,
  leaderboard_title TEXT     NOT NULL DEFAULT 'Leaderboard',
  hide_organizers BOOLEAN    NOT NULL DEFAULT true,
  prizes_description TEXT,
  prize_image_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1b. point_rules — customizable point values per activity
CREATE TABLE point_rules (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  activity_type  TEXT        NOT NULL,
  points         INT         NOT NULL DEFAULT 10,
  max_per_event  INT,
  enabled        BOOLEAN     NOT NULL DEFAULT true,
  UNIQUE (event_id, activity_type)
);

-- 1c. point_transactions — ledger / audit trail
CREATE TABLE point_transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type  TEXT        NOT NULL,
  points         INT         NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, activity_type, reference_id)
);

-- 1d. leaderboard_scores — aggregated cache
CREATE TABLE leaderboard_scores (
  event_id             UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points         INT         NOT NULL DEFAULT 0,
  rank                 INT,
  challenges_completed INT         NOT NULL DEFAULT 0,
  last_activity_at     TIMESTAMPTZ,
  PRIMARY KEY (event_id, user_id)
);

-- 1e. badge_definitions — badge templates
CREATE TABLE badge_definitions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        REFERENCES events(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  icon           TEXT        NOT NULL,
  criteria_type  TEXT        NOT NULL,
  criteria_value JSONB       NOT NULL,
  sort_order     INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1f. user_badges — earned badges
CREATE TABLE user_badges (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id       UUID        NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, badge_id)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_point_transactions_event_user
  ON point_transactions(event_id, user_id);

CREATE INDEX idx_point_transactions_event_activity
  ON point_transactions(event_id, activity_type);

CREATE INDEX idx_leaderboard_scores_rank
  ON leaderboard_scores(event_id, total_points DESC);

CREATE INDEX idx_badge_definitions_event
  ON badge_definitions(event_id);

CREATE INDEX idx_user_badges_event_user
  ON user_badges(event_id, user_id);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- 3a. award_points — atomically award points for an activity
CREATE OR REPLACE FUNCTION award_points(
  _event_id       UUID,
  _user_id        UUID,
  _activity_type  TEXT,
  _reference_id   UUID DEFAULT NULL,
  _reference_type TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled   BOOLEAN;
  _points    INT;
  _max       INT;
  _count     INT;
BEGIN
  -- Check gamification is enabled for this event
  SELECT gc.enabled INTO _enabled
    FROM gamification_configs gc
   WHERE gc.event_id = _event_id;

  IF _enabled IS NOT TRUE THEN
    RETURN 0;
  END IF;

  -- Look up the point rule
  SELECT pr.points, pr.max_per_event
    INTO _points, _max
    FROM point_rules pr
   WHERE pr.event_id = _event_id
     AND pr.activity_type = _activity_type
     AND pr.enabled = true;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Check max_per_event cap
  IF _max IS NOT NULL THEN
    SELECT count(*)::INT INTO _count
      FROM point_transactions pt
     WHERE pt.event_id = _event_id
       AND pt.user_id  = _user_id
       AND pt.activity_type = _activity_type;

    IF _count >= _max THEN
      RETURN 0;
    END IF;
  END IF;

  -- Insert transaction (ON CONFLICT = already earned)
  INSERT INTO point_transactions (event_id, user_id, activity_type, points, reference_id, reference_type)
  VALUES (_event_id, _user_id, _activity_type, _points, _reference_id, _reference_type)
  ON CONFLICT (event_id, user_id, activity_type, reference_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Upsert leaderboard_scores
  INSERT INTO leaderboard_scores (event_id, user_id, total_points, challenges_completed, last_activity_at)
  VALUES (_event_id, _user_id, _points, 1, now())
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET total_points         = leaderboard_scores.total_points + EXCLUDED.total_points,
        challenges_completed = leaderboard_scores.challenges_completed + 1,
        last_activity_at     = now();

  RETURN _points;
END;
$$;

-- 3b. recalculate_leaderboard — rebuild scores from transactions
CREATE OR REPLACE FUNCTION recalculate_leaderboard(_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM leaderboard_scores WHERE event_id = _event_id;

  INSERT INTO leaderboard_scores (event_id, user_id, total_points, challenges_completed, last_activity_at)
  SELECT
    pt.event_id,
    pt.user_id,
    SUM(pt.points)::INT,
    COUNT(*)::INT,
    MAX(pt.created_at)
  FROM point_transactions pt
  WHERE pt.event_id = _event_id
  GROUP BY pt.event_id, pt.user_id;
END;
$$;

-- ============================================================
-- 4. TABLE GRANTS (to authenticated)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON gamification_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON point_rules          TO authenticated;
GRANT SELECT                         ON point_transactions   TO authenticated;
GRANT SELECT                         ON leaderboard_scores   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON badge_definitions     TO authenticated;
GRANT SELECT                         ON user_badges          TO authenticated;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE gamification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges          ENABLE ROW LEVEL SECURITY;

-- gamification_configs
CREATE POLICY gamification_configs_org_manage ON gamification_configs
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

CREATE POLICY gamification_configs_attendee_view ON gamification_configs
  FOR SELECT
  USING (is_event_attendee(event_id));

-- point_rules
CREATE POLICY point_rules_org_manage ON point_rules
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

CREATE POLICY point_rules_attendee_view ON point_rules
  FOR SELECT
  USING (is_event_attendee(event_id));

-- point_transactions
CREATE POLICY point_transactions_org_view ON point_transactions
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'viewer'
    )
  );

CREATE POLICY point_transactions_own_view ON point_transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- leaderboard_scores
CREATE POLICY leaderboard_scores_org_view ON leaderboard_scores
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'viewer'
    )
  );

CREATE POLICY leaderboard_scores_attendee_view ON leaderboard_scores
  FOR SELECT
  USING (is_event_attendee(event_id));

-- badge_definitions
CREATE POLICY badge_definitions_org_manage ON badge_definitions
  FOR ALL
  USING (
    event_id IS NULL
    OR is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'editor'
    )
  )
  WITH CHECK (
    event_id IS NULL
    OR is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'editor'
    )
  );

CREATE POLICY badge_definitions_attendee_view ON badge_definitions
  FOR SELECT
  USING (
    event_id IS NULL
    OR is_event_attendee(event_id)
  );

-- user_badges
CREATE POLICY user_badges_org_view ON user_badges
  FOR SELECT
  USING (
    is_org_member(
      (SELECT e.organization_id FROM events e WHERE e.id = event_id),
      'viewer'
    )
  );

CREATE POLICY user_badges_own_view ON user_badges
  FOR SELECT
  USING (user_id = auth.uid());
