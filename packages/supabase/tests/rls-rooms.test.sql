BEGIN;
SELECT plan(7);

-- Setup
SELECT tests.create_supabase_user('room_editor');
SELECT tests.create_supabase_user('room_attendee');
SELECT tests.create_supabase_user('room_outsider');

SELECT tests.authenticate_as('room_editor');
SELECT tests.create_test_org('room_editor', 'Room Org', 'room-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'room-org'),
  'Room Event', 'room-event', 'published'
);

SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'room-event'),
  'room_attendee'
);

-- Editor creates a room
INSERT INTO breakout_rooms (id, event_id, title, max_capacity, starts_at, ends_at)
  VALUES (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'room-event'),
    'Discussion Room', 2,
    now() + interval '7 days',
    now() + interval '7 days' + interval '1 hour'
  );

-- T1: Rooms visible for published events
SELECT tests.authenticate_as('room_attendee');
SELECT isnt_empty(
  $$ SELECT id FROM breakout_rooms
     WHERE event_id = (SELECT id FROM events WHERE slug = 'room-event') $$,
  'Attendee can view rooms for published events'
);

-- T2: Editor can create rooms
SELECT tests.authenticate_as('room_editor');
SELECT lives_ok(
  $$ INSERT INTO breakout_rooms (event_id, title, starts_at, ends_at)
     VALUES (
       (SELECT id FROM events WHERE slug = 'room-event'),
       'Another Room',
       now() + interval '8 days',
       now() + interval '8 days' + interval '1 hour'
     ) $$,
  'Editor can create rooms'
);

-- T3: Outsider cannot create rooms
SELECT tests.authenticate_as('room_outsider');
SELECT throws_ok(
  $$ INSERT INTO breakout_rooms (event_id, title, starts_at, ends_at)
     VALUES (
       (SELECT id FROM events WHERE slug = 'room-event'),
       'Hacked Room',
       now() + interval '8 days',
       now() + interval '8 days' + interval '1 hour'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "breakout_rooms"',
  'Outsider cannot create rooms'
);

-- T4: Attendee can join room
SELECT tests.authenticate_as('room_attendee');
SELECT lives_ok(
  $$ INSERT INTO breakout_room_participants (room_id, user_id)
     VALUES (
       'b0000000-0000-0000-0000-000000000001'::uuid,
       tests.get_supabase_uid('room_attendee')
     ) $$,
  'Attendee can join room'
);

-- T5: Non-attendee cannot join room
SELECT tests.authenticate_as('room_outsider');
SELECT throws_ok(
  $$ INSERT INTO breakout_room_participants (room_id, user_id)
     VALUES (
       'b0000000-0000-0000-0000-000000000001'::uuid,
       tests.get_supabase_uid('room_outsider')
     ) $$,
  '42501',
  'new row violates row-level security policy for table "breakout_room_participants"',
  'Non-attendee cannot join room'
);

-- T6: User can leave room (delete own participation)
SELECT tests.authenticate_as('room_attendee');
SELECT lives_ok(
  $$ DELETE FROM breakout_room_participants
     WHERE user_id = tests.get_supabase_uid('room_attendee')
     AND room_id = 'b0000000-0000-0000-0000-000000000001'::uuid $$,
  'User can leave (delete own participation)'
);

-- T7: Editor can delete rooms
SELECT tests.authenticate_as('room_editor');
SELECT lives_ok(
  $$ DELETE FROM breakout_rooms
     WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid $$,
  'Editor can delete rooms'
);

SELECT * FROM finish();
ROLLBACK;
