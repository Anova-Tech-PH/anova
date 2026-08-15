BEGIN;
SELECT plan(32);

-- ============================================================
-- Setup: users, org, event, session, sponsor
-- ============================================================
SELECT tests.create_supabase_user('gx_editor');
SELECT tests.create_supabase_user('gx_attendee');
SELECT tests.create_supabase_user('gx_outsider');

SELECT tests.authenticate_as('gx_editor');
SELECT tests.create_test_org('gx_editor', 'GX Org', 'gx-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'gx-org'),
  'GX Event', 'gx-event', 'published'
);

SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'gx-event'),
  'gx_attendee'
);

-- Insert a sponsor (exhibitor) for passport tests
SELECT tests.authenticate_as('gx_editor');
INSERT INTO sponsors (id, event_id, name, tier)
VALUES (
  '00000000-0000-0000-0000-a00000000001'::uuid,
  (SELECT id FROM events WHERE slug = 'gx-event'),
  'Test Exhibitor',
  'gold'
);

-- Insert a session for session checkin tests
INSERT INTO sessions (id, event_id, title, starts_at, ends_at)
VALUES (
  '00000000-0000-0000-0000-a00000000002'::uuid,
  (SELECT id FROM events WHERE slug = 'gx-event'),
  'Test Session',
  now(),
  now() + interval '1 hour'
);

-- ============================================================
-- CONTESTS
-- ============================================================

-- T1: Editor can create a contest
SELECT tests.authenticate_as('gx_editor');
SELECT lives_ok(
  $$ INSERT INTO contests (id, event_id, type, title, starts_at, ends_at, status)
     VALUES (
       '00000000-0000-0000-0000-b00000000001'::uuid,
       (SELECT id FROM events WHERE slug = 'gx-event'),
       'photo', 'Photo Contest',
       now(), now() + interval '1 day', 'active'
     ) $$,
  'T1: Editor can create a contest'
);

-- T2: Attendee can see active contests
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM contests
     WHERE event_id = (SELECT id FROM events WHERE slug = 'gx-event') $$,
  $$ SELECT 1 $$,
  'T2: Attendee can see active contests'
);

-- T3: Outsider cannot see contests
SELECT tests.authenticate_as('gx_outsider');
SELECT is_empty(
  $$ SELECT id FROM contests
     WHERE event_id = (SELECT id FROM events WHERE slug = 'gx-event') $$,
  'T3: Outsider cannot see contests'
);

-- T4: Attendee can submit a contest entry
SELECT tests.authenticate_as('gx_attendee');
SELECT lives_ok(
  $$ INSERT INTO contest_entries (id, contest_id, user_id, content)
     VALUES (
       '00000000-0000-0000-0000-b00000000010'::uuid,
       '00000000-0000-0000-0000-b00000000001'::uuid,
       tests.get_supabase_uid('gx_attendee'),
       'My photo entry'
     ) $$,
  'T4: Attendee can submit a contest entry'
);

-- T5: Attendee can like an entry
SELECT tests.authenticate_as('gx_attendee');
SELECT lives_ok(
  $$ INSERT INTO contest_likes (entry_id, user_id)
     VALUES (
       '00000000-0000-0000-0000-b00000000010'::uuid,
       tests.get_supabase_uid('gx_attendee')
     ) $$,
  'T5: Attendee can like a contest entry'
);

-- T6: Likes count trigger updates contest_entries.likes_count
SELECT results_eq(
  $$ SELECT likes_count FROM contest_entries
     WHERE id = '00000000-0000-0000-0000-b00000000010'::uuid $$,
  $$ SELECT 1 $$,
  'T6: Likes count trigger increments correctly'
);

-- T7: Outsider cannot submit a contest entry
SELECT tests.authenticate_as('gx_outsider');
SELECT throws_ok(
  $$ INSERT INTO contest_entries (contest_id, user_id, content)
     VALUES (
       '00000000-0000-0000-0000-b00000000001'::uuid,
       tests.get_supabase_uid('gx_outsider'),
       'Should fail'
     ) $$,
  'T7: Outsider cannot submit a contest entry'
);

-- ============================================================
-- TRIVIA
-- ============================================================

-- T8: Editor can create a trivia game
SELECT tests.authenticate_as('gx_editor');
SELECT lives_ok(
  $$ INSERT INTO trivia_games (id, event_id, title, starts_at, ends_at, status)
     VALUES (
       '00000000-0000-0000-0000-c00000000001'::uuid,
       (SELECT id FROM events WHERE slug = 'gx-event'),
       'Test Trivia', now(), now() + interval '1 day', 'active'
     ) $$,
  'T8: Editor can create a trivia game'
);

-- T9: Editor can create trivia questions
SELECT tests.authenticate_as('gx_editor');
SELECT lives_ok(
  $$ INSERT INTO trivia_questions (id, game_id, question_text, options, correct_index, sort_order)
     VALUES (
       '00000000-0000-0000-0000-c00000000010'::uuid,
       '00000000-0000-0000-0000-c00000000001'::uuid,
       'What is 2+2?',
       '["3","4","5","6"]'::jsonb,
       1, 0
     ) $$,
  'T9: Editor can create trivia questions'
);

-- T10: Attendee CANNOT directly read trivia questions (RLS blocks)
SELECT tests.authenticate_as('gx_attendee');
SELECT is_empty(
  $$ SELECT id FROM trivia_questions
     WHERE game_id = '00000000-0000-0000-0000-c00000000001'::uuid $$,
  'T10: Attendee cannot directly read trivia questions'
);

-- T11: Attendee can see active trivia games
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM trivia_games
     WHERE event_id = (SELECT id FROM events WHERE slug = 'gx-event') $$,
  $$ SELECT 1 $$,
  'T11: Attendee can see active trivia games'
);

-- T12: get_trivia_question returns question without correct_index
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT (get_trivia_question(
       '00000000-0000-0000-0000-c00000000001'::uuid, 0
     ))->>'question_text' $$,
  $$ SELECT 'What is 2+2?' $$,
  'T12: get_trivia_question returns question text'
);

-- T13: get_trivia_question does NOT include correct_index
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT (get_trivia_question(
       '00000000-0000-0000-0000-c00000000001'::uuid, 0
     ))->'correct_index' IS NULL $$,
  $$ SELECT true $$,
  'T13: get_trivia_question omits correct_index'
);

-- T14: submit_trivia_answer returns correct result
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT (submit_trivia_answer(
       '00000000-0000-0000-0000-c00000000001'::uuid,
       tests.get_supabase_uid('gx_attendee'),
       '00000000-0000-0000-0000-c00000000010'::uuid,
       1, 500
     ))->>'correct' $$,
  $$ SELECT 'true' $$,
  'T14: submit_trivia_answer returns correct for right answer'
);

-- T15: Trivia attempt was created
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT score FROM trivia_attempts
     WHERE game_id = '00000000-0000-0000-0000-c00000000001'::uuid
       AND user_id = tests.get_supabase_uid('gx_attendee') $$,
  $$ SELECT 10 $$,
  'T15: Trivia attempt created with correct score'
);

-- T16: submit_trivia_answer returns incorrect for wrong answer
SELECT tests.authenticate_as('gx_editor');
SELECT results_eq(
  $$ SELECT (submit_trivia_answer(
       '00000000-0000-0000-0000-c00000000001'::uuid,
       tests.get_supabase_uid('gx_editor'),
       '00000000-0000-0000-0000-c00000000010'::uuid,
       0, 300
     ))->>'correct' $$,
  $$ SELECT 'false' $$,
  'T16: submit_trivia_answer returns incorrect for wrong answer'
);

-- ============================================================
-- EXHIBITOR PASSPORT
-- ============================================================

-- T17: Attendee can stamp passport
SELECT tests.authenticate_as('gx_attendee');
SELECT lives_ok(
  $$ INSERT INTO exhibitor_passport_stamps (event_id, user_id, exhibitor_id)
     VALUES (
       (SELECT id FROM events WHERE slug = 'gx-event'),
       tests.get_supabase_uid('gx_attendee'),
       '00000000-0000-0000-0000-a00000000001'::uuid
     ) $$,
  'T17: Attendee can stamp passport'
);

-- T18: Attendee can see own stamps
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM exhibitor_passport_stamps
     WHERE user_id = tests.get_supabase_uid('gx_attendee') $$,
  $$ SELECT 1 $$,
  'T18: Attendee can see own stamps'
);

-- T19: Outsider cannot see stamps
SELECT tests.authenticate_as('gx_outsider');
SELECT is_empty(
  $$ SELECT id FROM exhibitor_passport_stamps $$,
  'T19: Outsider cannot see stamps'
);

-- T20: Duplicate stamp is rejected (unique constraint)
SELECT tests.authenticate_as('gx_attendee');
SELECT throws_ok(
  $$ INSERT INTO exhibitor_passport_stamps (event_id, user_id, exhibitor_id)
     VALUES (
       (SELECT id FROM events WHERE slug = 'gx-event'),
       tests.get_supabase_uid('gx_attendee'),
       '00000000-0000-0000-0000-a00000000001'::uuid
     ) $$,
  'T20: Duplicate passport stamp is rejected'
);

-- ============================================================
-- SESSION CHECKINS
-- ============================================================

-- T21: Attendee can check in to session
SELECT tests.authenticate_as('gx_attendee');
SELECT lives_ok(
  $$ INSERT INTO session_checkins (event_id, session_id, user_id)
     VALUES (
       (SELECT id FROM events WHERE slug = 'gx-event'),
       '00000000-0000-0000-0000-a00000000002'::uuid,
       tests.get_supabase_uid('gx_attendee')
     ) $$,
  'T21: Attendee can check in to session'
);

-- T22: Attendee can see own checkins
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM session_checkins
     WHERE user_id = tests.get_supabase_uid('gx_attendee') $$,
  $$ SELECT 1 $$,
  'T22: Attendee can see own checkins'
);

-- T23: Outsider cannot see checkins
SELECT tests.authenticate_as('gx_outsider');
SELECT is_empty(
  $$ SELECT id FROM session_checkins $$,
  'T23: Outsider cannot see checkins'
);

-- ============================================================
-- REFERRALS
-- ============================================================

-- T24: Attendee can create a referral code
SELECT tests.authenticate_as('gx_attendee');
SELECT lives_ok(
  $$ INSERT INTO referral_codes (id, event_id, user_id, code)
     VALUES (
       '00000000-0000-0000-0000-d00000000001'::uuid,
       (SELECT id FROM events WHERE slug = 'gx-event'),
       tests.get_supabase_uid('gx_attendee'),
       'MYCODE123'
     ) $$,
  'T24: Attendee can create a referral code'
);

-- T25: Attendee can see own referral code
SELECT tests.authenticate_as('gx_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM referral_codes
     WHERE user_id = tests.get_supabase_uid('gx_attendee') $$,
  $$ SELECT 1 $$,
  'T25: Attendee can see own referral code'
);

-- T26: Outsider cannot see referral codes
SELECT tests.authenticate_as('gx_outsider');
SELECT is_empty(
  $$ SELECT id FROM referral_codes $$,
  'T26: Outsider cannot see referral codes'
);

-- T27: Referral registration can be inserted
SELECT tests.authenticate_as('gx_outsider');
-- Outsider registers via referral — insert done by SECURITY DEFINER in practice
-- For this test, use editor (who has org access to see referral_codes)
SELECT tests.authenticate_as('gx_editor');
SELECT lives_ok(
  $$ INSERT INTO referral_registrations (referral_code_id, registered_user_id)
     VALUES (
       '00000000-0000-0000-0000-d00000000001'::uuid,
       tests.get_supabase_uid('gx_outsider')
     ) $$,
  'T27: Referral registration can be recorded'
);

-- T28: Editor (org viewer) can see referral registrations
SELECT tests.authenticate_as('gx_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM referral_registrations $$,
  $$ SELECT 1 $$,
  'T28: Editor can see referral registrations'
);

-- ============================================================
-- ORG VIEWER ACCESS
-- ============================================================

-- T29: Editor can see all passport stamps
SELECT tests.authenticate_as('gx_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM exhibitor_passport_stamps
     WHERE event_id = (SELECT id FROM events WHERE slug = 'gx-event') $$,
  $$ SELECT 1 $$,
  'T29: Editor can see all passport stamps via org policy'
);

-- T30: Editor can see all session checkins
SELECT tests.authenticate_as('gx_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM session_checkins
     WHERE event_id = (SELECT id FROM events WHERE slug = 'gx-event') $$,
  $$ SELECT 1 $$,
  'T30: Editor can see all session checkins via org policy'
);

-- T31: Editor can see all trivia attempts
SELECT tests.authenticate_as('gx_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM trivia_attempts
     WHERE game_id = '00000000-0000-0000-0000-c00000000001'::uuid $$,
  $$ SELECT 2 $$,
  'T31: Editor can see all trivia attempts via org policy'
);

-- T32: Editor can manage (delete) a contest
SELECT tests.authenticate_as('gx_editor');
SELECT lives_ok(
  $$ UPDATE contests SET status = 'ended'
     WHERE id = '00000000-0000-0000-0000-b00000000001'::uuid $$,
  'T32: Editor can update a contest'
);

SELECT * FROM finish();
ROLLBACK;
