BEGIN;
SELECT plan(11);

-- Setup: create users
SELECT tests.create_supabase_user('reg_owner');
SELECT tests.create_supabase_user('reg_editor');
SELECT tests.create_supabase_user('reg_attendee_a');
SELECT tests.create_supabase_user('reg_attendee_b');
SELECT tests.create_supabase_user('reg_outsider');

-- Setup: create org with owner and editor
SELECT tests.authenticate_as('reg_owner');
SELECT tests.create_test_org('reg_owner', 'Reg Test Org', 'reg-test-org');

INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (
    (SELECT id FROM organizations WHERE slug = 'reg-test-org'),
    tests.get_supabase_uid('reg_editor'),
    'editor'
  );

-- Setup: create a published event
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'reg-test-org'),
  'Reg Test Event', 'reg-test-event', 'published'
);

-- Setup: create a draft event
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'reg-test-org'),
  'Draft Reg Event', 'draft-reg-event', 'draft'
);

-- Setup: create a session for the published event
SELECT tests.create_test_session(
  (SELECT id FROM events WHERE slug = 'reg-test-event')
);

-- Setup: register attendee_a for published event
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'reg-test-event'),
  'reg_attendee_a'
);

-- ========================
-- TICKET TYPES
-- ========================

-- T1: Anon can see ticket types for published events
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM ticket_types
     WHERE event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') $$,
  'Anon can see ticket types for published events'
);

-- T2: Outsider cannot see ticket types for draft events
SELECT tests.authenticate_as('reg_outsider');
SELECT is_empty(
  $$ SELECT id FROM ticket_types
     WHERE event_id = (SELECT id FROM events WHERE slug = 'draft-reg-event') $$,
  'Outsider cannot see ticket types for draft events'
);

-- T3: Editor can create ticket types
SELECT tests.authenticate_as('reg_editor');
SELECT lives_ok(
  $$ INSERT INTO ticket_types (id, event_id, name, price, quantity)
     VALUES (gen_random_uuid(),
       (SELECT id FROM events WHERE slug = 'reg-test-event'),
       'VIP', 50, 20) $$,
  'Editor can create ticket types'
);

-- ========================
-- REGISTRATIONS
-- ========================

-- T4: Authenticated user can register for published event
SELECT tests.authenticate_as('reg_attendee_b');
SELECT lives_ok(
  $$ INSERT INTO registrations (id, event_id, user_id, ticket_type_id, status, email, name, qr_code)
     VALUES (gen_random_uuid(),
       (SELECT id FROM events WHERE slug = 'reg-test-event'),
       tests.get_supabase_uid('reg_attendee_b'),
       (SELECT id FROM ticket_types WHERE event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') LIMIT 1),
       'pending', 'reg_attendee_b@test.com', 'reg_attendee_b', gen_random_uuid()::text) $$,
  'Authenticated user can register for published event'
);

-- T5: Cannot register for draft event
SELECT tests.authenticate_as('reg_outsider');
SELECT throws_ok(
  $$ INSERT INTO registrations (id, event_id, user_id, ticket_type_id, status, email, name, qr_code)
     VALUES (gen_random_uuid(),
       (SELECT id FROM events WHERE slug = 'draft-reg-event'),
       tests.get_supabase_uid('reg_outsider'),
       (SELECT id FROM ticket_types WHERE event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') LIMIT 1),
       'pending', 'reg_outsider@test.com', 'reg_outsider', gen_random_uuid()::text) $$,
  '42501',
  'new row violates row-level security policy for table "registrations"',
  'Cannot register for draft events'
);

-- T6: User can view own registrations
SELECT tests.authenticate_as('reg_attendee_a');
SELECT isnt_empty(
  $$ SELECT id FROM registrations
     WHERE user_id = tests.get_supabase_uid('reg_attendee_a') $$,
  'User can view own registrations'
);

-- T7: User cannot see other users' registrations
SELECT tests.authenticate_as('reg_outsider');
SELECT is_empty(
  $$ SELECT id FROM registrations
     WHERE event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') $$,
  'Outsider cannot see other users registrations'
);

-- T8: Org member can see all registrations
SELECT tests.authenticate_as('reg_editor');
SELECT isnt_empty(
  $$ SELECT id FROM registrations
     WHERE event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') $$,
  'Org member can see all event registrations'
);

-- T9: Editor can update registration status
SELECT tests.authenticate_as('reg_editor');
SELECT lives_ok(
  $$ UPDATE registrations SET status = 'confirmed'
     WHERE user_id = tests.get_supabase_uid('reg_attendee_b')
     AND event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') $$,
  'Editor can update registration status'
);

-- ========================
-- SESSION BOOKMARKS
-- ========================

-- T10: User can create own bookmarks
SELECT tests.authenticate_as('reg_attendee_a');
SELECT lives_ok(
  $$ INSERT INTO session_bookmarks (user_id, session_id)
     VALUES (
       tests.get_supabase_uid('reg_attendee_a'),
       (SELECT id FROM sessions
        WHERE event_id = (SELECT id FROM events WHERE slug = 'reg-test-event') LIMIT 1)
     ) $$,
  'User can create own session bookmarks'
);

-- T11: User cannot see other users' bookmarks
SELECT tests.authenticate_as('reg_attendee_b');
SELECT is_empty(
  $$ SELECT * FROM session_bookmarks
     WHERE user_id = tests.get_supabase_uid('reg_attendee_a') $$,
  'User cannot see other users bookmarks'
);

SELECT * FROM finish();
ROLLBACK;
