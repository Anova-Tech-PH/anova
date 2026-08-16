-- =============================================================================
-- Migration 089: Public Read Access for Poll Presentation
-- Grants anon role SELECT on live_polls and live_poll_votes so the
-- public presentation view works without authentication.
-- =============================================================================

GRANT SELECT ON public.live_polls TO anon;
GRANT SELECT ON public.live_poll_votes TO anon;

CREATE POLICY "Public can view live polls"
  ON public.live_polls FOR SELECT TO anon USING (true);

CREATE POLICY "Public can view poll votes"
  ON public.live_poll_votes FOR SELECT TO anon USING (true);
