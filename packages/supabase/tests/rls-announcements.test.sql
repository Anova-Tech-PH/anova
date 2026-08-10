BEGIN;
SELECT plan(8);

-- Setup
SELECT tests.create_supabase_user('ann_editor');
SELECT tests.create_supabase_user('ann_attendee');
SELECT tests.create_supabase_user('ann_outsider');

SELECT tests.authenticate_as('ann_editor');
SELECT tests.create_test_org('ann_editor', 'Ann Org', 'ann-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'ann-org'),
  'Ann Event', 'ann-event', 'published'
);

-- Register attendee
SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'ann-event'),
  'ann_attendee'
);

-- Editor creates a draft and a sent announcement
INSERT INTO announcements (id, event_id, author_id, subject, body, status)
  VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM events WHERE slug = 'ann-event'),
    tests.get_supabase_uid('ann_editor'),
    'Draft Announcement', 'Not ready yet', 'draft'
  );
INSERT INTO announcements (id, event_id, author_id, subject, body, status, sent_at)
  VALUES (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM events WHERE slug = 'ann-event'),
    tests.get_supabase_uid('ann_editor'),
    'Sent Announcement', 'Hello everyone!', 'sent', now()
  );

-- T1: Editor can view all announcements (drafts and sent)
SELECT tests.authenticate_as('ann_editor');
SELECT results_eq(
  $$ SELECT count(*)::int FROM announcements
     WHERE event_id = (SELECT id FROM events WHERE slug = 'ann-event') $$,
  $$ SELECT 2 $$,
  'Editor can view all announcements'
);

-- T2: Attendee can view sent announcements only
SELECT tests.authenticate_as('ann_attendee');
SELECT results_eq(
  $$ SELECT count(*)::int FROM announcements
     WHERE event_id = (SELECT id FROM events WHERE slug = 'ann-event') $$,
  $$ SELECT 1 $$,
  'Attendee can only see sent announcements'
);

-- T3: Outsider cannot view any announcements
SELECT tests.authenticate_as('ann_outsider');
SELECT is_empty(
  $$ SELECT id FROM announcements
     WHERE event_id = (SELECT id FROM events WHERE slug = 'ann-event') $$,
  'Outsider cannot view announcements'
);

-- T4: Editor can update announcements
SELECT tests.authenticate_as('ann_editor');
SELECT lives_ok(
  $$ UPDATE announcements SET subject = 'Updated Subject'
     WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid $$,
  'Editor can update announcements'
);

-- T5: Attendee cannot create announcements
SELECT tests.authenticate_as('ann_attendee');
SELECT throws_ok(
  $$ INSERT INTO announcements (event_id, author_id, subject, body)
     VALUES (
       (SELECT id FROM events WHERE slug = 'ann-event'),
       tests.get_supabase_uid('ann_attendee'),
       'Hacked', 'Should fail'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "announcements"',
  'Attendee cannot create announcements'
);

-- T6: User can mark own reads
SELECT tests.authenticate_as('ann_attendee');
SELECT lives_ok(
  $$ INSERT INTO announcement_reads (announcement_id, user_id)
     VALUES ('a0000000-0000-0000-0000-000000000002'::uuid,
       tests.get_supabase_uid('ann_attendee')) $$,
  'User can mark own announcement reads'
);

-- T7: User cannot mark reads for others
SELECT tests.authenticate_as('ann_attendee');
SELECT throws_ok(
  $$ INSERT INTO announcement_reads (announcement_id, user_id)
     VALUES ('a0000000-0000-0000-0000-000000000002'::uuid,
       tests.get_supabase_uid('ann_editor')) $$,
  '42501',
  'new row violates row-level security policy for table "announcement_reads"',
  'User cannot mark reads for others'
);

-- T8: Editor can delete announcements
SELECT tests.authenticate_as('ann_editor');
SELECT lives_ok(
  $$ DELETE FROM announcements WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid $$,
  'Editor can delete announcements'
);

SELECT * FROM finish();
ROLLBACK;
