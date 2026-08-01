-- =============================================================================
-- Enrich demo seed data for more impressive dashboard screenshots
-- More events, registrations, check-ins, and realistic stats
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_event_for_org(_org_id uuid)
RETURNS void AS $$
DECLARE
  _event1_id uuid;
  _event2_id uuid;
  _event3_id uuid;
  _event4_id uuid;
  _track_id uuid;
  _track2_id uuid;
  _speaker1_id uuid;
  _speaker2_id uuid;
  _speaker3_id uuid;
  _speaker4_id uuid;
  _speaker5_id uuid;
  _session1_id uuid;
  _session2_id uuid;
  _session3_id uuid;
  _session4_id uuid;
  _session5_id uuid;
  _session6_id uuid;
  _ticket_free_id uuid;
  _ticket_vip_id uuid;
  _ticket_early_id uuid;
  _start date;
  _start2 date;
  _past1 date;
  _past2 date;
  _future date;
BEGIN
  _start := current_date + 30;
  _start2 := current_date + 32;
  _past1 := current_date - 14;
  _past2 := current_date - 45;
  _future := current_date + 90;

  -- =========================================================================
  -- EVENT 1: Main upcoming conference (published)
  -- =========================================================================
  INSERT INTO public.events (
    id, organization_id, title, slug, description,
    start_date, end_date, timezone,
    venue_name, venue_address, is_virtual, status
  ) VALUES (
    gen_random_uuid(), _org_id,
    'Tech Summit 2026',
    'tech-summit-2026',
    'The premier technology conference bringing together engineers, designers, and product leaders. '
    || 'Three days of keynotes, hands-on workshops, and networking with 500+ attendees.',
    (_start || ' 09:00:00')::timestamptz,
    (_start2 || ' 17:00:00')::timestamptz,
    'America/Los_Angeles',
    'Moscone Center',
    '747 Howard St, San Francisco, CA',
    false,
    'published'
  ) RETURNING id INTO _event1_id;

  -- =========================================================================
  -- EVENT 2: Past completed event (published, with check-ins)
  -- =========================================================================
  INSERT INTO public.events (
    id, organization_id, title, slug, description,
    start_date, end_date, timezone,
    venue_name, venue_address, is_virtual, status
  ) VALUES (
    gen_random_uuid(), _org_id,
    'Design Meetup — July',
    'design-meetup-july',
    'Monthly design community meetup. Lightning talks, portfolio reviews, and networking.',
    (_past1 || ' 18:00:00')::timestamptz,
    (_past1 || ' 21:00:00')::timestamptz,
    'America/Los_Angeles',
    'WeWork Mission',
    '25 Taylor St, San Francisco, CA',
    false,
    'published'
  ) RETURNING id INTO _event2_id;

  -- =========================================================================
  -- EVENT 3: Another past event (published, completed)
  -- =========================================================================
  INSERT INTO public.events (
    id, organization_id, title, slug, description,
    start_date, end_date, timezone,
    venue_name, venue_address, is_virtual, status
  ) VALUES (
    gen_random_uuid(), _org_id,
    'Startup Workshop: From Idea to MVP',
    'startup-workshop-mvp',
    'Intensive full-day workshop on validating ideas and building your first product.',
    (_past2 || ' 09:00:00')::timestamptz,
    (_past2 || ' 17:00:00')::timestamptz,
    'America/Los_Angeles',
    'Startup Hub',
    '500 2nd St, San Francisco, CA',
    false,
    'published'
  ) RETURNING id INTO _event3_id;

  -- =========================================================================
  -- EVENT 4: Draft event
  -- =========================================================================
  INSERT INTO public.events (
    id, organization_id, title, slug, description,
    start_date, end_date, timezone,
    venue_name, is_virtual, status
  ) VALUES (
    gen_random_uuid(), _org_id,
    'AI Workshop 2026',
    'ai-workshop-2026',
    'Hands-on workshop on practical AI and machine learning applications.',
    (_future || ' 09:00:00')::timestamptz,
    (_future || ' 17:00:00')::timestamptz,
    'America/Los_Angeles',
    'TBD',
    false,
    'draft'
  ) RETURNING id INTO _event4_id;

  -- =========================================================================
  -- TRACKS & SPEAKERS for Event 1 (Tech Summit)
  -- =========================================================================
  INSERT INTO public.tracks (id, event_id, name, color, sort_order)
  VALUES (gen_random_uuid(), _event1_id, 'Engineering', '#0d9488', 0)
  RETURNING id INTO _track_id;

  INSERT INTO public.tracks (id, event_id, name, color, sort_order)
  VALUES (gen_random_uuid(), _event1_id, 'Product & Design', '#6366f1', 1)
  RETURNING id INTO _track2_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event1_id, 'Sarah Chen', 'CTO', 'TechForward Inc.', 'Technology leader with 15 years of experience.')
  RETURNING id INTO _speaker1_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event1_id, 'Marcus Rivera', 'Head of Product', 'InnovateCo', 'Product strategist who has launched products used by millions.')
  RETURNING id INTO _speaker2_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event1_id, 'Dr. Priya Sharma', 'Research Director', 'AI Labs', 'Leads research on practical ML applications.')
  RETURNING id INTO _speaker3_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event1_id, 'Elena Volkov', 'Principal PM', 'Notion', 'Product mind behind some of the most-loved productivity features.')
  RETURNING id INTO _speaker4_id;

  INSERT INTO public.speakers (id, event_id, name, title, company, bio)
  VALUES (gen_random_uuid(), _event1_id, 'James Thornton', 'VP Engineering', 'Vercel', 'Scaling engineering orgs from 10 to 200+.')
  RETURNING id INTO _speaker5_id;

  -- Sessions for Event 1
  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event1_id, _track_id,
    'Opening Keynote: The Future of Software', 'Kick off with insights on the next decade.', 'keynote',
    (_start || ' 09:00:00')::timestamptz, (_start || ' 10:00:00')::timestamptz, 'Main Hall')
  RETURNING id INTO _session1_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event1_id, _track_id,
    'Building Resilient Distributed Systems', 'Patterns for fault-tolerant architectures.', 'talk',
    (_start || ' 10:30:00')::timestamptz, (_start || ' 11:30:00')::timestamptz, 'Room A')
  RETURNING id INTO _session2_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event1_id, NULL,
    'Lunch Break', 'Networking lunch.', 'break',
    (_start || ' 11:30:00')::timestamptz, (_start || ' 13:00:00')::timestamptz, 'Atrium')
  RETURNING id INTO _session3_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event1_id, _track2_id,
    'Design Systems That Scale', 'How to build and maintain design systems.', 'talk',
    (_start || ' 10:30:00')::timestamptz, (_start || ' 11:30:00')::timestamptz, 'Room B')
  RETURNING id INTO _session4_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event1_id, _track_id,
    'AI in Practice: Real-World Applications', 'Deploying AI solutions today.', 'talk',
    (_start || ' 13:00:00')::timestamptz, (_start || ' 14:00:00')::timestamptz, 'Main Hall')
  RETURNING id INTO _session5_id;

  INSERT INTO public.sessions (id, event_id, track_id, title, description, type, start_time, end_time, location)
  VALUES (gen_random_uuid(), _event1_id, _track2_id,
    'From 0 to 1: Finding Product-Market Fit', 'Frameworks for early-stage product decisions.', 'talk',
    (_start || ' 13:00:00')::timestamptz, (_start || ' 14:00:00')::timestamptz, 'Room C')
  RETURNING id INTO _session6_id;

  -- Link speakers
  INSERT INTO public.session_speakers (session_id, speaker_id) VALUES
    (_session1_id, _speaker5_id),
    (_session2_id, _speaker1_id),
    (_session4_id, _speaker2_id),
    (_session5_id, _speaker3_id),
    (_session6_id, _speaker4_id);

  -- Ticket types for Event 1
  INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order)
  VALUES (gen_random_uuid(), _event1_id, 'General Admission', 'Access to all talks and keynotes', 'free', 0, 200, 0)
  RETURNING id INTO _ticket_free_id;

  INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order)
  VALUES (gen_random_uuid(), _event1_id, 'VIP Pass', 'Priority seating, networking lunch, speaker meet & greet', 'paid', 199.00, 50, 1)
  RETURNING id INTO _ticket_vip_id;

  INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order)
  VALUES (gen_random_uuid(), _event1_id, 'Early Bird', 'Discounted general admission', 'paid', 49.00, 100, 2)
  RETURNING id INTO _ticket_early_id;

  -- 18 registrations for Event 1 (upcoming, so no check-ins yet)
  INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status)
  SELECT _event1_id, _ticket_free_id, email, name, 'demo-' || substr(gen_random_uuid()::text, 1, 8), 'confirmed'
  FROM (VALUES
    ('alice.j@example.com', 'Alice Johnson'),
    ('bob.m@example.com', 'Bob Martinez'),
    ('carol.w@example.com', 'Carol Williams'),
    ('dave.k@example.com', 'Dave Kim'),
    ('emily.n@example.com', 'Emily Nguyen'),
    ('frank.o@example.com', 'Frank Otieno'),
    ('grace.l@example.com', 'Grace Lee'),
    ('henry.z@example.com', 'Henry Zhao'),
    ('irene.p@example.com', 'Irene Park'),
    ('jason.r@example.com', 'Jason Rodriguez')
  ) AS t(email, name);

  INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status)
  SELECT _event1_id, _ticket_vip_id, email, name, 'demo-' || substr(gen_random_uuid()::text, 1, 8), 'confirmed'
  FROM (VALUES
    ('kate.s@example.com', 'Kate Sullivan'),
    ('leo.t@example.com', 'Leo Torres'),
    ('mia.c@example.com', 'Mia Chen'),
    ('noah.b@example.com', 'Noah Brown')
  ) AS t(email, name);

  INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status)
  SELECT _event1_id, _ticket_early_id, email, name, 'demo-' || substr(gen_random_uuid()::text, 1, 8), 'confirmed'
  FROM (VALUES
    ('olivia.d@example.com', 'Olivia Davis'),
    ('peter.w@example.com', 'Peter Wang'),
    ('quinn.h@example.com', 'Quinn Harris'),
    ('rachel.m@example.com', 'Rachel Moore')
  ) AS t(email, name);

  -- =========================================================================
  -- Registrations + Check-ins for Event 2 (past Design Meetup — 32 regs, 28 checked in)
  -- =========================================================================
  INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order)
  VALUES (gen_random_uuid(), _event2_id, 'Free RSVP', 'Free entry', 'free', 0, 50, 0)
  RETURNING id INTO _ticket_free_id;

  -- 32 registrations, 28 checked in
  INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status)
  SELECT _event2_id, _ticket_free_id,
    'attendee' || n || '@example.com',
    (ARRAY['Sophia','Liam','Emma','James','Ava','William','Isabella','Oliver','Mia','Benjamin','Charlotte','Elijah','Amelia','Lucas','Harper','Mason','Evelyn','Logan','Abigail','Alexander','Ella','Ethan','Scarlett','Daniel','Grace','Michael','Chloe','Sebastian','Aria','Jack','Luna','Aiden'])[n],
    'demo-dm-' || substr(gen_random_uuid()::text, 1, 8),
    CASE WHEN n <= 28 THEN 'checked_in' ELSE 'confirmed' END
  FROM generate_series(1, 32) AS n;

  -- =========================================================================
  -- Registrations + Check-ins for Event 3 (past Workshop — 24 regs, 20 checked in)
  -- =========================================================================
  INSERT INTO public.ticket_types (id, event_id, name, description, type, price, quantity, sort_order)
  VALUES (gen_random_uuid(), _event3_id, 'Workshop Pass', 'Full-day workshop access', 'paid', 79.00, 30, 0)
  RETURNING id INTO _ticket_free_id;

  INSERT INTO public.registrations (event_id, ticket_type_id, email, name, qr_code, status)
  SELECT _event3_id, _ticket_free_id,
    'workshop' || n || '@example.com',
    (ARRAY['Ryan','Zoe','Nathan','Lily','Tyler','Hannah','Luke','Stella','Dylan','Nora','Caleb','Hazel','Owen','Violet','Isaac','Aurora','Levi','Savannah','Aaron','Audrey','Eli','Brooklyn','Connor','Claire'])[n],
    'demo-ws-' || substr(gen_random_uuid()::text, 1, 8),
    CASE WHEN n <= 20 THEN 'checked_in' ELSE 'confirmed' END
  FROM generate_series(1, 24) AS n;

  -- Breakout rooms for Event 1
  INSERT INTO public.breakout_rooms (event_id, session_id, title, description, facilitator_name, location, max_capacity, starts_at, ends_at, status) VALUES
    (_event1_id, _session2_id,
      'System Design Workshop', 'Hands-on distributed systems design exercises.',
      'Sarah Chen', 'Room 201', 25,
      (_start || ' 11:30:00')::timestamptz, (_start || ' 12:30:00')::timestamptz, 'open'),
    (_event1_id, _session5_id,
      'AI Ethics Roundtable', 'Open discussion on responsible AI development.',
      'Dr. Priya Sharma', 'Room 202', 20,
      (_start || ' 14:00:00')::timestamptz, (_start || ' 15:00:00')::timestamptz, 'open'),
    (_event1_id, NULL,
      'Networking Lounge', 'Drop-in space to connect with fellow attendees.',
      NULL, 'Lounge Area', 50,
      (_start || ' 09:00:00')::timestamptz, (_start || ' 17:00:00')::timestamptz, 'open');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
