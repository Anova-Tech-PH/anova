BEGIN;
SELECT plan(14);

-- Setup: create users
SELECT tests.create_supabase_user('evt_owner');
SELECT tests.create_supabase_user('evt_editor');
SELECT tests.create_supabase_user('evt_viewer');
SELECT tests.create_supabase_user('evt_outsider');

-- Setup: create org with owner, add editor and viewer
SELECT tests.authenticate_as('evt_owner');
SELECT tests.create_test_org('evt_owner', 'Event Test Org', 'event-test-org');

INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (
    (SELECT id FROM organizations WHERE slug = 'event-test-org'),
    tests.get_supabase_uid('evt_editor'),
    'editor'
  );
INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (
    (SELECT id FROM organizations WHERE slug = 'event-test-org'),
    tests.get_supabase_uid('evt_viewer'),
    'viewer'
  );

-- Setup: create a published and a draft event
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'event-test-org'),
  'Published Event', 'published-event', 'published'
);
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'event-test-org'),
  'Draft Event', 'draft-event', 'draft'
);

-- Setup: create track, speaker, session for published event
INSERT INTO tracks (id, event_id, name, color)
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM events WHERE slug = 'published-event'),
    'Main Track', '#FF0000'
  );
INSERT INTO speakers (id, event_id, name, bio)
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM events WHERE slug = 'published-event'),
    'Test Speaker', 'A great speaker'
  );
INSERT INTO sessions (id, event_id, title, type, start_time, end_time)
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM events WHERE slug = 'published-event'),
    'Test Talk', 'talk',
    now() + interval '7 days',
    now() + interval '7 days' + interval '1 hour'
  );

-- ========================
-- EVENTS POLICIES
-- ========================

-- T1: Anon can see published events
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM events WHERE slug = 'published-event' $$,
  'Anon can see published events'
);

-- T2: Anon cannot see draft events
SELECT tests.authenticate_as_anon();
SELECT is_empty(
  $$ SELECT id FROM events WHERE slug = 'draft-event' $$,
  'Anon cannot see draft events'
);

-- T3: Org viewer can see draft events
SELECT tests.authenticate_as('evt_viewer');
SELECT isnt_empty(
  $$ SELECT id FROM events WHERE slug = 'draft-event' $$,
  'Org viewer can see draft events'
);

-- T4: Editor can create events
SELECT tests.authenticate_as('evt_editor');
SELECT lives_ok(
  $$ INSERT INTO events (id, organization_id, title, slug, status, start_date, end_date, timezone)
     VALUES (gen_random_uuid(),
       (SELECT id FROM organizations WHERE slug = 'event-test-org'),
       'Editor Event', 'editor-event', 'draft',
       now() + interval '10 days', now() + interval '11 days', 'UTC') $$,
  'Editor can create events'
);

-- T5: Viewer cannot create events
SELECT tests.authenticate_as('evt_viewer');
SELECT throws_ok(
  $$ INSERT INTO events (id, organization_id, title, slug, status, start_date, end_date, timezone)
     VALUES (gen_random_uuid(),
       (SELECT id FROM organizations WHERE slug = 'event-test-org'),
       'Viewer Event', 'viewer-event', 'draft',
       now() + interval '10 days', now() + interval '11 days', 'UTC') $$,
  '42501',
  'new row violates row-level security policy for table "events"',
  'Viewer cannot create events'
);

-- T6: Editor can update events
SELECT tests.authenticate_as('evt_editor');
SELECT lives_ok(
  $$ UPDATE events SET title = 'Updated Title' WHERE slug = 'published-event' $$,
  'Editor can update events'
);

-- T7: Outsider cannot update events
SELECT tests.authenticate_as('evt_outsider');
SELECT results_eq(
  $$ UPDATE events SET title = 'Hacked' WHERE slug = 'published-event' RETURNING id $$,
  $$ SELECT id FROM events WHERE false $$,
  'Outsider cannot update events'
);

-- T8: Admin (owner) can delete events
SELECT tests.authenticate_as('evt_owner');
SELECT lives_ok(
  $$ DELETE FROM events WHERE slug = 'editor-event' $$,
  'Admin/owner can delete events'
);

-- T9: Editor cannot delete events (needs admin)
SELECT tests.authenticate_as('evt_editor');
SELECT results_eq(
  $$ DELETE FROM events WHERE slug = 'draft-event' RETURNING id $$,
  $$ SELECT id FROM events WHERE false $$,
  'Editor cannot delete events (requires admin)'
);

-- ========================
-- TRACKS / SPEAKERS / SESSIONS
-- ========================

-- T10: Anon can see tracks for published events
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM tracks
     WHERE event_id = (SELECT id FROM events WHERE slug = 'published-event') $$,
  'Anon can see tracks for published events'
);

-- T11: Anon can see speakers for published events
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM speakers
     WHERE event_id = (SELECT id FROM events WHERE slug = 'published-event') $$,
  'Anon can see speakers for published events'
);

-- T12: Anon can see sessions for published events
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM sessions
     WHERE event_id = (SELECT id FROM events WHERE slug = 'published-event') $$,
  'Anon can see sessions for published events'
);

-- T13: Editor can create sessions
SELECT tests.authenticate_as('evt_editor');
SELECT lives_ok(
  $$ INSERT INTO sessions (id, event_id, title, type, start_time, end_time)
     VALUES (gen_random_uuid(),
       (SELECT id FROM events WHERE slug = 'published-event'),
       'New Session', 'workshop',
       now() + interval '8 days', now() + interval '8 days' + interval '1 hour') $$,
  'Editor can create sessions'
);

-- T14: Outsider cannot create sessions
SELECT tests.authenticate_as('evt_outsider');
SELECT throws_ok(
  $$ INSERT INTO sessions (id, event_id, title, type, start_time, end_time)
     VALUES (gen_random_uuid(),
       (SELECT id FROM events WHERE slug = 'published-event'),
       'Hacked Session', 'talk',
       now() + interval '8 days', now() + interval '8 days' + interval '1 hour') $$,
  '42501',
  'new row violates row-level security policy for table "sessions"',
  'Outsider cannot create sessions'
);

SELECT * FROM finish();
ROLLBACK;
