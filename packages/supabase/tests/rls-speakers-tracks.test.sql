BEGIN;
SELECT plan(8);

-- Setup
SELECT tests.create_supabase_user('st_editor');
SELECT tests.create_supabase_user('st_outsider');

SELECT tests.authenticate_as('st_editor');
SELECT tests.create_test_org('st_editor', 'ST Org', 'st-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'st-org'),
  'ST Event', 'st-event', 'published'
);

-- Editor creates a speaker
INSERT INTO speakers (id, event_id, name, title)
  VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'st-event'),
    'Jane Speaker', 'CEO'
  );

-- Editor creates a track
INSERT INTO tracks (id, event_id, name)
  VALUES (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM events WHERE slug = 'st-event'),
    'Main Track'
  );

-- Link speaker to session
SELECT tests.create_test_session(
  (SELECT id FROM events WHERE slug = 'st-event'),
  'ST Talk'
);
INSERT INTO session_speakers (session_id, speaker_id)
  VALUES (
    (SELECT id FROM sessions WHERE title = 'ST Talk'),
    'a0000000-0000-0000-0000-000000000001'::uuid
  );

-- T1: Anyone can view speakers for published events
SELECT tests.authenticate_as('st_outsider');
SELECT isnt_empty(
  $$ SELECT id FROM speakers
     WHERE event_id = (SELECT id FROM events WHERE slug = 'st-event') $$,
  'Anyone can view speakers for published events'
);

-- T2: Anyone can view tracks for published events
SELECT isnt_empty(
  $$ SELECT id FROM tracks
     WHERE event_id = (SELECT id FROM events WHERE slug = 'st-event') $$,
  'Anyone can view tracks for published events'
);

-- T3: Anyone can view session_speakers for published events
SELECT isnt_empty(
  $$ SELECT session_id FROM session_speakers
     WHERE session_id = (SELECT id FROM sessions WHERE title = 'ST Talk') $$,
  'Anyone can view session speakers for published events'
);

-- T4: Outsider cannot create speakers
SELECT throws_ok(
  $$ INSERT INTO speakers (event_id, name)
     VALUES (
       (SELECT id FROM events WHERE slug = 'st-event'),
       'Hacked Speaker'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "speakers"',
  'Outsider cannot create speakers'
);

-- T5: Outsider cannot create tracks
SELECT throws_ok(
  $$ INSERT INTO tracks (event_id, name)
     VALUES (
       (SELECT id FROM events WHERE slug = 'st-event'),
       'Hacked Track'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "tracks"',
  'Outsider cannot create tracks'
);

-- T6: Editor can create speakers
SELECT tests.authenticate_as('st_editor');
SELECT lives_ok(
  $$ INSERT INTO speakers (event_id, name)
     VALUES (
       (SELECT id FROM events WHERE slug = 'st-event'),
       'New Speaker'
     ) $$,
  'Editor can create speakers'
);

-- T7: Editor can update tracks
SELECT lives_ok(
  $$ UPDATE tracks SET name = 'Updated Track'
     WHERE id = 'a0000000-0000-0000-0000-000000000002'::uuid $$,
  'Editor can update tracks'
);

-- T8: Editor can delete speakers
SELECT lives_ok(
  $$ DELETE FROM speakers
     WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid $$,
  'Editor can delete speakers'
);

SELECT * FROM finish();
ROLLBACK;
