-- 075_whova_gamification_parity.sql
-- Adds: leaderboard_congratulations table, prize columns on contests

-- Leaderboard Congratulations
CREATE TABLE IF NOT EXISTS leaderboard_congratulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, from_user_id, to_user_id)
);

ALTER TABLE leaderboard_congratulations
  ADD CONSTRAINT no_self_congratulation CHECK (from_user_id != to_user_id);

CREATE INDEX idx_congrats_event_to ON leaderboard_congratulations(event_id, to_user_id);
CREATE INDEX idx_congrats_event_from ON leaderboard_congratulations(event_id, from_user_id);

ALTER TABLE leaderboard_congratulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event congratulations"
  ON leaderboard_congratulations FOR SELECT
  USING (true);

CREATE POLICY "Users can congratulate others"
  ON leaderboard_congratulations FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can remove own congratulations"
  ON leaderboard_congratulations FOR DELETE
  USING (auth.uid() = from_user_id);

GRANT SELECT, INSERT, DELETE ON leaderboard_congratulations TO authenticated;
GRANT SELECT ON leaderboard_congratulations TO anon;

-- FK from leaderboard_scores.user_id to profiles.id (enables PostgREST join)
ALTER TABLE leaderboard_scores
  ADD CONSTRAINT leaderboard_scores_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id);

-- Prize Columns on Contests
ALTER TABLE contests ADD COLUMN IF NOT EXISTS prize_description text;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS winner_criteria text;
ALTER TABLE contests ADD COLUMN IF NOT EXISTS theme text;
