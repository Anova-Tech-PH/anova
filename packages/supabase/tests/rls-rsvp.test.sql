BEGIN;
SELECT plan(7);

-- Setup
SELECT tests.create_supabase_user('rsvp_editor');
SELECT tests.create_supabase_user('rsvp_attendee_a');
SELECT tests.create_supabase_user('rsvp_attendee_b');
SELECT tests.create_supabase_user('rsvp_outsider');

SELECT tests.authenticate_as('rsvp_editor');
SELECT tests.create_test_org('rsvp_editor', 'RSVP Org', 'rsvp-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'rsvp-org'),
  'RSVP Event', 'rsvp-event', 'published'
);

-- Create session with capacity of 1
INSERT INTO sessions (id, event_id, title, type, capacity, start_time, end_time)
  VALUES (
    '00000000-0000-0000-0000-200000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'rsvp-event'),
    'Limited Session', 'talk', 1,
    now() + interval '7 days', now() + interval '7 days' + interval '1 hour'
  );

-- Register both attendees
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'rsvp-event'),
  'rsvp_attendee_a'
);
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'rsvp-event'),
  'rsvp_attendee_b'
);

-- T1: RSVP RPC confirms when under capacity
SELECT tests.authenticate_as('rsvp_attendee_a');
SELECT results_eq(
  $$ SELECT rsvp_to_session('00000000-0000-0000-0000-200000000001'::uuid) $$,
  $$ SELECT 'confirmed'::text $$,
  'rsvp_to_session confirms when under capacity'
);

-- T2: RSVP RPC waitlists when at capacity
SELECT tests.authenticate_as('rsvp_attendee_b');
SELECT results_eq(
  $$ SELECT rsvp_to_session('00000000-0000-0000-0000-200000000001'::uuid) $$,
  $$ SELECT 'waitlisted'::text $$,
  'rsvp_to_session waitlists when at capacity'
);

-- T3: Attendee can view own RSVPs
SELECT tests.authenticate_as('rsvp_attendee_a');
SELECT isnt_empty(
  $$ SELECT id FROM session_rsvps
     WHERE user_id = tests.get_supabase_uid('rsvp_attendee_a')
     AND session_id = '00000000-0000-0000-0000-200000000001'::uuid $$,
  'Attendee can view own RSVPs'
);

-- T4: Org member can view all RSVPs
SELECT tests.authenticate_as('rsvp_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM session_rsvps
     WHERE session_id = '00000000-0000-0000-0000-200000000001'::uuid
     AND status != 'cancelled' $$,
  $$ SELECT 2 $$,
  'Org member can view all RSVPs'
);

-- T5: Authenticated users can view RSVPs for published events
SELECT tests.authenticate_as('rsvp_outsider');
SELECT isnt_empty(
  $$ SELECT id FROM session_rsvps
     WHERE session_id = '00000000-0000-0000-0000-200000000001'::uuid $$,
  'Authenticated users can view RSVPs for published event sessions'
);

-- T6: Cancel RSVP promotes waitlisted user
SELECT tests.authenticate_as('rsvp_attendee_a');
SELECT lives_ok(
  $$ SELECT cancel_session_rsvp('00000000-0000-0000-0000-200000000001'::uuid) $$,
  'cancel_session_rsvp does not throw'
);

-- T7: Verify waitlisted user was promoted to confirmed
SELECT tests.authenticate_as('rsvp_attendee_b');
SELECT results_eq(
  $$ SELECT status FROM session_rsvps
     WHERE user_id = tests.get_supabase_uid('rsvp_attendee_b')
     AND session_id = '00000000-0000-0000-0000-200000000001'::uuid $$,
  $$ SELECT 'confirmed'::text $$,
  'Waitlisted user promoted to confirmed after cancellation'
);

SELECT * FROM finish();
ROLLBACK;
