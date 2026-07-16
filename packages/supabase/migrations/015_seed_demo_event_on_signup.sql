-- =============================================================================
-- Auto-seed a demo event when a new organization is created
-- Gives new users a working example to explore the platform
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_event_for_org(_org_id uuid)
RETURNS void AS $$
DECLARE
  _event_id uuid;
  _track_id uuid;
  _speaker1_id uuid;
  _speaker2_id uuid;
  _speaker3_id uuid;
  _session1_id uuid;
  _session2_id uuid;
  _session3_id uuid;
  _session4_id uuid;
  _start date;
BEGIN
  -- Event starts 30 days from now
  _start := current_date + interval '30 days';

  -- Create demo event
  INSERT INTO public.events (
    id, organization_id, title, slug, description,
    start_date, end_date, timezone,
    venue_name, venue_address, is_virtual, status
  ) VALUES (
    gen_random_uuid(), _org_id,
    'Sample Conference 2026',
    'sample-conference-2026',
    'This is a demo event to help you explore Anova. Feel free to edit or delete it. '
    || 'It includes sample speakers, sessions, ticket types, and registrations so you can see how everything works together.',
    (_start || ' 09:00:00')::timestamptz,
    (_start || ' 17:00:00')::timestamptz,
    'America/Los_Angeles',
    'Convention Center',
    '123 Main St, San Francisco, CA',
    false,
    'published'
  ) RETURNING id INTO _event_id;

  -- Create a track
  INSERT INTO public.tracks (id, event_id, name, color, sort_order)
  VALUES (gen_random_uuid(), _event_id, 'Main Stage', '#0d9488', 0)
  RETURNING id INTO _track_id;

  -- Create speakers
  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event_id,
    'Sarah Chen', 'CTO', 'TechForward Inc.',
    'Sarah is a technology leader with 15 years of experience building scalable platforms.')
  RETURNING id INTO _speaker1_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event_id,
    'Marcus Rivera', 'Head of Product', 'InnovateCo',
    'Marcus specializes in product strategy and has launched products used by millions.')
  RETURNING id INTO _speaker2_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event_id,
    'Dr. Priya Sharma', 'Research Director', 'AI Labs',
    'Dr. Sharma leads a team researching practical applications of machine learning.')
  RETURNING id INTO _speaker3_id;

  -- Create sessions
  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event_id, _track_id,
    'Opening Keynote: The Future of Technology',
    'Kick off the conference with insights on emerging trends shaping the next decade.',
    'keynote',
    (_start || ' 09:00:00')::timestamptz,
    (_start || ' 10:00:00')::timestamptz,
    'Main Hall')
  RETURNING id INTO _session1_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event_id, _track_id,
    'Building Products Users Love',
    'Learn proven frameworks for user-centric product development.',
    'talk',
    (_start || ' 10:30:00')::timestamptz,
    (_start || ' 11:30:00')::timestamptz,
    'Main Hall')
  RETURNING id INTO _session2_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event_id, NULL,
    'Lunch Break',
    'Networking lunch in the atrium.',
    'break',
    (_start || ' 11:30:00')::timestamptz,
    (_start || ' 13:00:00')::timestamptz,
    'Atrium')
  RETURNING id INTO _session3_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event_id, _track_id,
    'AI in Practice: Real-World Applications',
    'A deep dive into how organizations are deploying AI solutions today.',
    'talk',
    (_start || ' 13:00:00')::timestamptz,
    (_start || ' 14:00:00')::timestamptz,
    'Main Hall')
  RETURNING id INTO _session4_id;

  -- Link speakers to sessions
  INSERT INTO public.session_speakers (session_id, speaker_id) VALUES
    (_session1_id, _speaker1_id),
    (_session2_id, _speaker2_id),
    (_session4_id, _speaker3_id);

  -- Create ticket types
  INSERT INTO public.ticket_types (event_id, name, description, type, price, quantity, sort_order) VALUES
    (_event_id, 'Free Admission', 'General access to all talks and keynotes', 'free', 0, 100, 0),
    (_event_id, 'VIP Pass', 'Priority seating, networking lunch, and speaker meet & greet', 'paid', 149.00, 25, 1);

  -- Create sample registrations (guest registrations, no user_id)
  INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status)
  SELECT
    _event_id,
    (SELECT id FROM public.ticket_types WHERE event_id = _event_id AND sort_order = 0 LIMIT 1),
    email, name, 'demo-' || substr(gen_random_uuid()::text, 1, 8), 'confirmed'
  FROM (VALUES
    ('demo-attendee1@example.com', 'Jamie Wilson'),
    ('demo-attendee2@example.com', 'Morgan Taylor'),
    ('demo-attendee3@example.com', 'Casey Brooks')
  ) AS t(email, name);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_organization_with_owner to also seed demo event
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _slug text
) RETURNS uuid AS $$
DECLARE
  _org_id uuid;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'owner');

  -- Seed a demo event so new users have something to explore
  PERFORM public.seed_demo_event_for_org(_org_id);

  RETURN _org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
