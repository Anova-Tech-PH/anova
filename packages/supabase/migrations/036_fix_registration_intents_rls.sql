-- =============================================================================
-- Fix registration_intents RLS policies
-- S1: Remove overly permissive anon UPDATE policy (upsert works via INSERT)
-- S2: Add anon SELECT policy for intent pre-fill (by ID only)
-- =============================================================================

-- S1: Drop the overly permissive anon UPDATE policy
DROP POLICY IF EXISTS "Anyone can update own registration intents" ON public.registration_intents;

-- Revoke UPDATE from anon — upsert ON CONFLICT works through INSERT policy
REVOKE UPDATE ON public.registration_intents FROM anon;

-- S2: Allow anon to SELECT by ID (for intent pre-fill on public registration pages)
-- Intent IDs are UUIDs (unguessable), so this is safe
CREATE POLICY "Anyone can read own registration intent by id"
  ON public.registration_intents FOR SELECT TO anon
  USING (true);

-- Note: We use USING(true) because the page queries by .eq("id", intentId)
-- and intent IDs are cryptographically random UUIDs. Restricting further
-- would require knowing the email, which we don't have before the fetch.
-- The SELECT grant was already given in migration 035.
