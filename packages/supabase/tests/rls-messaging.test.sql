BEGIN;
SELECT plan(6);

-- Setup
SELECT tests.create_supabase_user('msg_editor');
SELECT tests.create_supabase_user('msg_attendee_a');
SELECT tests.create_supabase_user('msg_attendee_b');
SELECT tests.create_supabase_user('msg_outsider');

SELECT tests.authenticate_as('msg_editor');
SELECT tests.create_test_org('msg_editor', 'Msg Org', 'msg-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'msg-org'),
  'Msg Event', 'msg-event', 'published'
);

SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'msg-event'),
  'msg_attendee_a'
);
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'msg-event'),
  'msg_attendee_b'
);

-- T1: create_dm_conversation RPC works for attendees
SELECT tests.authenticate_as('msg_attendee_a');
SELECT isnt(
  create_dm_conversation(
    (SELECT id FROM events WHERE slug = 'msg-event'),
    tests.get_supabase_uid('msg_attendee_b')
  ),
  NULL::uuid,
  'create_dm_conversation returns conversation id'
);

-- T2: create_dm_conversation deduplicates
SELECT tests.authenticate_as('msg_attendee_a');
SELECT results_eq(
  $$ SELECT create_dm_conversation(
       (SELECT id FROM events WHERE slug = 'msg-event'),
       tests.get_supabase_uid('msg_attendee_b')
     ) $$,
  $$ SELECT create_dm_conversation(
       (SELECT id FROM events WHERE slug = 'msg-event'),
       tests.get_supabase_uid('msg_attendee_b')
     ) $$,
  'create_dm_conversation returns same id on second call'
);

-- T3: Conversation member can view conversation
SELECT tests.authenticate_as('msg_attendee_a');
SELECT isnt_empty(
  $$ SELECT id FROM conversations
     WHERE event_id = (SELECT id FROM events WHERE slug = 'msg-event') $$,
  'Conversation member can view their conversations'
);

-- T4: Outsider cannot view conversations
SELECT tests.authenticate_as('msg_outsider');
SELECT is_empty(
  $$ SELECT id FROM conversations
     WHERE event_id = (SELECT id FROM events WHERE slug = 'msg-event') $$,
  'Outsider cannot view conversations'
);

-- T5: Member can send messages
SELECT tests.authenticate_as('msg_attendee_a');
SELECT lives_ok(
  $$ INSERT INTO messages (conversation_id, sender_id, content)
     VALUES (
       (SELECT id FROM conversations
        WHERE event_id = (SELECT id FROM events WHERE slug = 'msg-event') LIMIT 1),
       tests.get_supabase_uid('msg_attendee_a'),
       'Hello!'
     ) $$,
  'Conversation member can send messages'
);

-- T6: Outsider cannot view messages
SELECT tests.authenticate_as('msg_outsider');
SELECT is_empty(
  $$ SELECT id FROM messages $$,
  'Outsider cannot view messages'
);

SELECT * FROM finish();
ROLLBACK;
