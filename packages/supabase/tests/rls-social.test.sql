BEGIN;
SELECT plan(10);

-- Setup
SELECT tests.create_supabase_user('soc_editor');
SELECT tests.create_supabase_user('soc_attendee_a');
SELECT tests.create_supabase_user('soc_attendee_b');
SELECT tests.create_supabase_user('soc_outsider');

SELECT tests.authenticate_as('soc_editor');
SELECT tests.create_test_org('soc_editor', 'Social Org', 'social-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'social-org'),
  'Social Event', 'social-event', 'published'
);

SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'social-event'),
  'soc_attendee_a'
);
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'social-event'),
  'soc_attendee_b'
);

-- Attendee A creates a post
SELECT tests.authenticate_as('soc_attendee_a');
INSERT INTO posts (id, event_id, author_id, content)
  VALUES (
    'a0000001-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'social-event'),
    tests.get_supabase_uid('soc_attendee_a'),
    'Hello from attendee A!'
  );

-- ========================
-- POSTS
-- ========================

-- T1: Attendee can view event posts
SELECT tests.authenticate_as('soc_attendee_b');
SELECT isnt_empty(
  $$ SELECT id FROM posts WHERE event_id = (SELECT id FROM events WHERE slug = 'social-event') $$,
  'Attendee can view event posts'
);

-- T2: Outsider cannot view event posts
SELECT tests.authenticate_as('soc_outsider');
SELECT is_empty(
  $$ SELECT id FROM posts WHERE event_id = (SELECT id FROM events WHERE slug = 'social-event') $$,
  'Non-attendee outsider cannot view posts'
);

-- T3: Org editor can view posts (even without registration)
SELECT tests.authenticate_as('soc_editor');
SELECT isnt_empty(
  $$ SELECT id FROM posts WHERE event_id = (SELECT id FROM events WHERE slug = 'social-event') $$,
  'Org editor can view posts'
);

-- T4: Attendee can create posts
SELECT tests.authenticate_as('soc_attendee_b');
SELECT lives_ok(
  $$ INSERT INTO posts (event_id, author_id, content)
     VALUES (
       (SELECT id FROM events WHERE slug = 'social-event'),
       tests.get_supabase_uid('soc_attendee_b'),
       'Post by attendee B'
     ) $$,
  'Attendee can create posts'
);

-- T5: Author can update own post
SELECT tests.authenticate_as('soc_attendee_a');
SELECT lives_ok(
  $$ UPDATE posts SET content = 'Updated!'
     WHERE id = 'a0000001-0000-0000-0000-000000000001'::uuid $$,
  'Author can update own post'
);

-- T6: Other attendee cannot update post
SELECT tests.authenticate_as('soc_attendee_b');
SELECT results_eq(
  $$ UPDATE posts SET content = 'Hacked!'
     WHERE id = 'a0000001-0000-0000-0000-000000000001'::uuid RETURNING id $$,
  $$ SELECT id FROM posts WHERE false $$,
  'Other attendee cannot update post'
);

-- ========================
-- POST_LIKES
-- ========================

-- T7: Attendee can like posts
SELECT tests.authenticate_as('soc_attendee_b');
SELECT lives_ok(
  $$ INSERT INTO post_likes (user_id, post_id)
     VALUES (tests.get_supabase_uid('soc_attendee_b'),
       'a0000001-0000-0000-0000-000000000001'::uuid) $$,
  'Attendee can like posts'
);

-- ========================
-- COMMENTS
-- ========================

-- T8: Attendee can comment on posts
SELECT tests.authenticate_as('soc_attendee_b');
SELECT lives_ok(
  $$ INSERT INTO comments (post_id, author_id, content)
     VALUES ('a0000001-0000-0000-0000-000000000001'::uuid,
       tests.get_supabase_uid('soc_attendee_b'), 'Nice post!') $$,
  'Attendee can comment on posts'
);

-- ========================
-- CONNECTIONS
-- ========================

-- T9: User can send connection request
SELECT tests.authenticate_as('soc_attendee_a');
SELECT lives_ok(
  $$ INSERT INTO connections (requester_id, receiver_id, event_id)
     VALUES (
       tests.get_supabase_uid('soc_attendee_a'),
       tests.get_supabase_uid('soc_attendee_b'),
       (SELECT id FROM events WHERE slug = 'social-event')
     ) $$,
  'User can send connection request'
);

-- T10: Receiver can accept connection
SELECT tests.authenticate_as('soc_attendee_b');
SELECT lives_ok(
  $$ UPDATE connections SET status = 'accepted'
     WHERE receiver_id = tests.get_supabase_uid('soc_attendee_b') $$,
  'Receiver can accept connection request'
);

SELECT * FROM finish();
ROLLBACK;
