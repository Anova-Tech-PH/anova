-- Grant DELETE on live_poll_votes to authenticated users
-- Without this, voting fails because vote functions delete existing votes before inserting new ones
GRANT DELETE ON live_poll_votes TO authenticated;
