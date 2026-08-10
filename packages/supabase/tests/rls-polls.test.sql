BEGIN;
SELECT plan(8);

-- Setup
SELECT tests.create_supabase_user('poll_editor');
SELECT tests.create_supabase_user('poll_attendee');
SELECT tests.create_supabase_user('poll_outsider');

SELECT tests.authenticate_as('poll_editor');
SELECT tests.create_test_org('poll_editor', 'Poll Org', 'poll-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'poll-org'),
  'Poll Event', 'poll-event', 'published'
);

-- Register attendee
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'poll-event'),
  'poll_attendee'
);

-- Create polls: draft, open, closed
INSERT INTO live_polls (id, event_id, created_by, question, options, status)
  VALUES (
    '00000000-0000-0000-0000-100000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'poll-event'),
    tests.get_supabase_uid('poll_editor'),
    'Draft poll?', '[{"id":"a","text":"Yes"},{"id":"b","text":"No"}]'::jsonb,
    'draft'
  );
INSERT INTO live_polls (id, event_id, created_by, question, options, status)
  VALUES (
    '00000000-0000-0000-0000-100000000002'::uuid,
    (SELECT id FROM events WHERE slug = 'poll-event'),
    tests.get_supabase_uid('poll_editor'),
    'Open poll?', '[{"id":"a","text":"Yes"},{"id":"b","text":"No"}]'::jsonb,
    'open'
  );

-- T1: Editor can view all polls (including drafts)
SELECT tests.authenticate_as('poll_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM live_polls
     WHERE event_id = (SELECT id FROM events WHERE slug = 'poll-event') $$,
  $$ SELECT 2 $$,
  'Editor can view all polls including drafts'
);

-- T2: Attendee can view open polls only (not drafts)
SELECT tests.authenticate_as('poll_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM live_polls
     WHERE event_id = (SELECT id FROM events WHERE slug = 'poll-event') $$,
  $$ SELECT 1 $$,
  'Attendee can only see open/closed polls'
);

-- T3: Outsider cannot view any polls
SELECT tests.authenticate_as('poll_outsider');
SELECT is_empty(
  $$ SELECT id FROM live_polls
     WHERE event_id = (SELECT id FROM events WHERE slug = 'poll-event') $$,
  'Outsider cannot view polls'
);

-- T4: Attendee can vote
SELECT tests.authenticate_as('poll_attendee');
SELECT lives_ok(
  $$ INSERT INTO live_poll_votes (poll_id, user_id, option_id)
     VALUES (
       '00000000-0000-0000-0000-100000000002'::uuid,
       tests.get_supabase_uid('poll_attendee'),
       'a'
     ) $$,
  'Attendee can vote on open poll'
);

-- T5: Attendee can change vote
SELECT tests.authenticate_as('poll_attendee');
SELECT lives_ok(
  $$ UPDATE live_poll_votes SET option_id = 'b'
     WHERE poll_id = '00000000-0000-0000-0000-100000000002'::uuid
     AND user_id = tests.get_supabase_uid('poll_attendee') $$,
  'Attendee can change their vote'
);

-- T6: User can view own votes
SELECT tests.authenticate_as('poll_attendee');
SELECT isnt_empty(
  $$ SELECT option_id FROM live_poll_votes
     WHERE user_id = tests.get_supabase_uid('poll_attendee') $$,
  'User can view own votes'
);

-- T7: Org member can view all votes
SELECT tests.authenticate_as('poll_editor');
SELECT isnt_empty(
  $$ SELECT option_id FROM live_poll_votes
     WHERE poll_id = '00000000-0000-0000-0000-100000000002'::uuid $$,
  'Org member can view all votes'
);

-- T8: Outsider cannot view votes
SELECT tests.authenticate_as('poll_outsider');
SELECT is_empty(
  $$ SELECT option_id FROM live_poll_votes
     WHERE poll_id = '00000000-0000-0000-0000-100000000002'::uuid $$,
  'Outsider cannot view votes'
);

SELECT * FROM finish();
ROLLBACK;
