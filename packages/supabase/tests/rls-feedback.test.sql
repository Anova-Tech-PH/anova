BEGIN;
SELECT plan(7);

-- Setup
SELECT tests.create_supabase_user('fb_editor');
SELECT tests.create_supabase_user('fb_attendee');
SELECT tests.create_supabase_user('fb_outsider');

SELECT tests.authenticate_as('fb_editor');
SELECT tests.create_test_org('fb_editor', 'FB Org', 'fb-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'fb-org'),
  'FB Event', 'fb-event', 'published'
);
SELECT tests.create_test_session(
  (SELECT id FROM events WHERE slug = 'fb-event'),
  'FB Session'
);

-- Register attendee
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'fb-event'),
  'fb_attendee'
);

-- Create feedback form
INSERT INTO feedback_forms (id, event_id, name, questions, is_default)
  VALUES (
    'f0000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'fb-event'),
    'Session Feedback', '[{"id":"q1","type":"rating","label":"Rate this session"}]'::jsonb,
    true
  );

-- T1: Editor can manage feedback forms
SELECT tests.authenticate_as('fb_editor');
SELECT isnt_empty(
  $$ SELECT id FROM feedback_forms
     WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') $$,
  'Editor can view feedback forms'
);

-- T2: Attendee can view feedback forms for published events
SELECT tests.authenticate_as('fb_attendee');
SELECT isnt_empty(
  $$ SELECT id FROM feedback_forms
     WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') $$,
  'Attendee can view feedback forms'
);

-- T3: Outsider cannot view feedback forms
SELECT tests.authenticate_as('fb_outsider');
SELECT is_empty(
  $$ SELECT id FROM feedback_forms
     WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') $$,
  'Outsider cannot view feedback forms'
);

-- T4: Attendee can submit feedback
SELECT tests.authenticate_as('fb_attendee');
SELECT lives_ok(
  $$ INSERT INTO session_feedback (session_id, user_id, feedback_form_id, answers)
     VALUES (
       (SELECT id FROM sessions WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') LIMIT 1),
       tests.get_supabase_uid('fb_attendee'),
       'f0000000-0000-0000-0000-000000000001'::uuid,
       '{"q1": 5}'::jsonb
     ) $$,
  'Attendee can submit session feedback'
);

-- T5: Duplicate feedback blocked by unique constraint
SELECT tests.authenticate_as('fb_attendee');
SELECT throws_ok(
  $$ INSERT INTO session_feedback (session_id, user_id, feedback_form_id, answers)
     VALUES (
       (SELECT id FROM sessions WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') LIMIT 1),
       tests.get_supabase_uid('fb_attendee'),
       'f0000000-0000-0000-0000-000000000001'::uuid,
       '{"q1": 3}'::jsonb
     ) $$,
  '23505',
  'duplicate key value violates unique constraint "session_feedback_session_id_user_id_key"',
  'Duplicate feedback submission blocked'
);

-- T6: Org member can view all feedback
SELECT tests.authenticate_as('fb_editor');
SELECT isnt_empty(
  $$ SELECT id FROM session_feedback
     WHERE session_id = (SELECT id FROM sessions WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') LIMIT 1) $$,
  'Org member can view all session feedback'
);

-- T7: Outsider cannot view feedback
SELECT tests.authenticate_as('fb_outsider');
SELECT is_empty(
  $$ SELECT id FROM session_feedback
     WHERE session_id = (SELECT id FROM sessions WHERE event_id = (SELECT id FROM events WHERE slug = 'fb-event') LIMIT 1) $$,
  'Outsider cannot view session feedback'
);

SELECT * FROM finish();
ROLLBACK;
