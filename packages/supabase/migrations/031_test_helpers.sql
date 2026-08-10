-- Test helper schema and functions for pgTAP tests
-- These run inside transactions that ROLLBACK, so they never persist
--
-- WARNING: This migration creates a `tests` schema with SECURITY DEFINER
-- functions that can create auth users and switch roles. Do NOT deploy
-- this migration to production databases. Exclude it from `supabase db push`
-- in production environments.

CREATE SCHEMA IF NOT EXISTS tests;

-- Grant access so tests can switch roles and still call helpers
GRANT USAGE ON SCHEMA tests TO anon, authenticated;

-- Helper: create a test user in auth.users
CREATE OR REPLACE FUNCTION tests.create_supabase_user(
  identifier text,
  email text DEFAULT null,
  phone text DEFAULT null
) RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, role, aud, email, phone,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    COALESCE(email, identifier || '@test.com'), phone,
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('full_name', identifier)::jsonb,
    now(), now()
  );
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: authenticate as a test user (set JWT claims)
-- NOT SECURITY DEFINER: must be able to set_config('role', ...)
CREATE OR REPLACE FUNCTION tests.authenticate_as(identifier text)
RETURNS void AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := tests.get_supabase_uid(identifier);
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.aud', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$ LANGUAGE plpgsql;

-- Helper: get user id by identifier
CREATE OR REPLACE FUNCTION tests.get_supabase_uid(identifier text)
RETURNS uuid AS $$
  SELECT id FROM auth.users WHERE email = identifier || '@test.com';
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: reset to anon role
-- NOT SECURITY DEFINER: must be able to set_config('role', ...)
CREATE OR REPLACE FUNCTION tests.authenticate_as_anon()
RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claim.aud', 'authenticated', true);
  PERFORM set_config('role', 'anon', true);
END;
$$ LANGUAGE plpgsql;

-- Helper: create org with owner
CREATE OR REPLACE FUNCTION tests.create_test_org(
  owner_identifier text,
  org_name text DEFAULT 'Test Org',
  org_slug text DEFAULT 'test-org'
) RETURNS uuid AS $$
DECLARE
  org_id uuid;
  owner_id uuid;
BEGIN
  owner_id := tests.get_supabase_uid(owner_identifier);
  org_id := gen_random_uuid();
  INSERT INTO public.organizations (id, name, slug) VALUES (org_id, org_name, org_slug);
  INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, owner_id, 'owner');
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: create published event
CREATE OR REPLACE FUNCTION tests.create_test_event(
  org_id uuid,
  event_title text DEFAULT 'Test Event',
  event_slug text DEFAULT 'test-event',
  event_status text DEFAULT 'published'
) RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  event_id := gen_random_uuid();
  INSERT INTO public.events (id, organization_id, title, slug, status, start_date, end_date, timezone)
    VALUES (event_id, org_id, event_title, event_slug, event_status,
            now() + interval '7 days', now() + interval '8 days', 'UTC');
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: register attendee for event (creates ticket type if needed)
CREATE OR REPLACE FUNCTION tests.register_attendee(
  p_event_id uuid,
  user_identifier text
) RETURNS uuid AS $$
DECLARE
  reg_id uuid;
  p_user_id uuid;
  tt_id uuid;
BEGIN
  p_user_id := tests.get_supabase_uid(user_identifier);
  SELECT id INTO tt_id FROM public.ticket_types WHERE event_id = p_event_id LIMIT 1;
  IF tt_id IS NULL THEN
    tt_id := gen_random_uuid();
    INSERT INTO public.ticket_types (id, event_id, name, price, quantity)
      VALUES (tt_id, p_event_id, 'General', 0, 100);
  END IF;
  reg_id := gen_random_uuid();
  INSERT INTO public.registrations (id, event_id, user_id, ticket_type_id, status, email, name, qr_code)
    VALUES (reg_id, p_event_id, p_user_id, tt_id, 'confirmed',
            user_identifier || '@test.com', user_identifier, gen_random_uuid()::text);
  RETURN reg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: create test session for an event
CREATE OR REPLACE FUNCTION tests.create_test_session(
  p_event_id uuid,
  session_title text DEFAULT 'Test Session',
  session_type text DEFAULT 'talk'
) RETURNS uuid AS $$
DECLARE
  session_id uuid;
BEGIN
  session_id := gen_random_uuid();
  INSERT INTO public.sessions (id, event_id, title, type, start_time, end_time)
    VALUES (session_id, p_event_id, session_title, session_type,
            now() + interval '7 days' + interval '2 hours',
            now() + interval '7 days' + interval '3 hours');
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow all roles to execute test helper functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated;
