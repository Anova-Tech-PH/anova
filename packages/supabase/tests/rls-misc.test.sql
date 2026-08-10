BEGIN;
SELECT plan(20);

-- Setup
SELECT tests.create_supabase_user('misc_editor');
SELECT tests.create_supabase_user('misc_attendee');
SELECT tests.create_supabase_user('misc_outsider');

SELECT tests.authenticate_as('misc_editor');
SELECT tests.create_test_org('misc_editor', 'Misc Org', 'misc-org');
SELECT tests.create_test_event(
  (SELECT id FROM organizations WHERE slug = 'misc-org'),
  'Misc Event', 'misc-event', 'published'
);

SELECT tests.register_attendee(
  (SELECT id FROM events WHERE slug = 'misc-event'),
  'misc_attendee'
);

-- ========================
-- EMAIL TEMPLATES
-- ========================

-- Editor creates email template
INSERT INTO email_templates (id, organization_id, name, subject, body_html)
  VALUES (
    'e0000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM organizations WHERE slug = 'misc-org'),
    'Welcome', 'Welcome!', '<p>Hello</p>'
  );

-- T1: Org member can view email templates
SELECT isnt_empty(
  $$ SELECT id FROM email_templates
     WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'misc-org') $$,
  'Org member can view email templates'
);

-- T2: Outsider cannot view email templates
SELECT tests.authenticate_as('misc_outsider');
SELECT is_empty(
  $$ SELECT id FROM email_templates $$,
  'Outsider cannot view email templates'
);

-- T3: Outsider cannot create email templates
SELECT throws_ok(
  $$ INSERT INTO email_templates (organization_id, name, subject, body_html)
     VALUES (
       (SELECT id FROM organizations WHERE slug = 'misc-org'),
       'Hacked', 'Hack', '<p>bad</p>'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "email_templates"',
  'Outsider cannot create email templates'
);

-- ========================
-- PROMO CODES
-- ========================

SELECT tests.authenticate_as('misc_editor');
INSERT INTO promo_codes (id, event_id, code, discount_type, discount_value)
  VALUES (
    'e0000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM events WHERE slug = 'misc-event'),
    'SAVE10', 'percentage', 10
  );

-- T4: Anyone can view promo codes for published events
SELECT tests.authenticate_as('misc_outsider');
SELECT isnt_empty(
  $$ SELECT id FROM promo_codes
     WHERE event_id = (SELECT id FROM events WHERE slug = 'misc-event') $$,
  'Anyone can view promo codes for published events'
);

-- T5: Outsider cannot create promo codes
SELECT throws_ok(
  $$ INSERT INTO promo_codes (event_id, code, discount_type, discount_value)
     VALUES (
       (SELECT id FROM events WHERE slug = 'misc-event'),
       'HACK', 'percentage', 100
     ) $$,
  '42501',
  'new row violates row-level security policy for table "promo_codes"',
  'Outsider cannot create promo codes'
);

-- T6: Editor can manage promo codes
SELECT tests.authenticate_as('misc_editor');
SELECT lives_ok(
  $$ UPDATE promo_codes SET discount_value = 15
     WHERE id = 'e0000000-0000-0000-0000-000000000002'::uuid $$,
  'Editor can update promo codes'
);

-- ========================
-- SURVEYS & RESPONSES
-- ========================

INSERT INTO surveys (id, event_id, title, questions, active)
  VALUES (
    'e0000000-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM events WHERE slug = 'misc-event'),
    'Post-Event Survey',
    '[{"q": "How was it?", "type": "text"}]'::jsonb,
    true
  );

-- T7: Outsider can view active surveys for published events
SELECT tests.authenticate_as('misc_outsider');
SELECT isnt_empty(
  $$ SELECT id FROM surveys
     WHERE event_id = (SELECT id FROM events WHERE slug = 'misc-event') $$,
  'Anyone can view active surveys for published events'
);

-- T8: Outsider cannot manage surveys
SELECT throws_ok(
  $$ INSERT INTO surveys (event_id, title, questions)
     VALUES (
       (SELECT id FROM events WHERE slug = 'misc-event'),
       'Hacked Survey', '[]'::jsonb
     ) $$,
  '42501',
  'new row violates row-level security policy for table "surveys"',
  'Outsider cannot create surveys'
);

-- T9: Anyone can submit survey responses (anon insert allowed)
SELECT tests.authenticate_as('misc_outsider');
SELECT lives_ok(
  $$ INSERT INTO survey_responses (survey_id, respondent_email, answers)
     VALUES (
       'e0000000-0000-0000-0000-000000000003'::uuid,
       'anon@example.com',
       '{"q1": "Great!"}'::jsonb
     ) $$,
  'Anyone can submit survey responses'
);

-- T10: Org member can view survey responses
SELECT tests.authenticate_as('misc_editor');
SELECT isnt_empty(
  $$ SELECT id FROM survey_responses
     WHERE survey_id = 'e0000000-0000-0000-0000-000000000003'::uuid $$,
  'Org member can view survey responses'
);

-- T11: Outsider cannot view survey responses
SELECT tests.authenticate_as('misc_outsider');
SELECT is_empty(
  $$ SELECT id FROM survey_responses
     WHERE survey_id = 'e0000000-0000-0000-0000-000000000003'::uuid $$,
  'Outsider cannot view survey responses'
);

-- ========================
-- EVENT TEMPLATES
-- ========================

SELECT tests.authenticate_as('misc_editor');
INSERT INTO event_templates (id, organization_id, name, template_data)
  VALUES (
    'e0000000-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM organizations WHERE slug = 'misc-org'),
    'Conference Template', '{"sessions": []}'::jsonb
  );

-- T12: Org member can view templates
SELECT isnt_empty(
  $$ SELECT id FROM event_templates
     WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'misc-org') $$,
  'Org member can view event templates'
);

-- T13: Outsider cannot view templates
SELECT tests.authenticate_as('misc_outsider');
SELECT is_empty(
  $$ SELECT id FROM event_templates $$,
  'Outsider cannot view event templates'
);

-- ========================
-- CUSTOM REGISTRATION FIELDS
-- ========================

SELECT tests.authenticate_as('misc_editor');
INSERT INTO custom_registration_fields (id, event_id, label, field_key, type)
  VALUES (
    'e0000000-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM events WHERE slug = 'misc-event'),
    'Company', 'company', 'text'
  );

-- T14: Anyone can view custom fields for published events
SELECT tests.authenticate_as('misc_outsider');
SELECT isnt_empty(
  $$ SELECT id FROM custom_registration_fields
     WHERE event_id = (SELECT id FROM events WHERE slug = 'misc-event') $$,
  'Anyone can view custom fields for published events'
);

-- T15: Outsider cannot create custom fields
SELECT throws_ok(
  $$ INSERT INTO custom_registration_fields (event_id, label, field_key)
     VALUES (
       (SELECT id FROM events WHERE slug = 'misc-event'),
       'Hacked', 'hacked'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "custom_registration_fields"',
  'Outsider cannot create custom fields'
);

-- ========================
-- PUSH TOKENS
-- ========================

-- T16: User can insert own push token
SELECT tests.authenticate_as('misc_attendee');
SELECT lives_ok(
  $$ INSERT INTO push_tokens (user_id, expo_push_token, platform)
     VALUES (tests.get_supabase_uid('misc_attendee'), 'ExponentPushToken[xxx]', 'ios') $$,
  'User can insert own push token'
);

-- T17: User can view own push tokens
SELECT isnt_empty(
  $$ SELECT id FROM push_tokens WHERE user_id = tests.get_supabase_uid('misc_attendee') $$,
  'User can view own push tokens'
);

-- T18: Other user cannot view push tokens
SELECT tests.authenticate_as('misc_outsider');
SELECT is_empty(
  $$ SELECT id FROM push_tokens $$,
  'Other user cannot view push tokens'
);

-- ========================
-- ANNOUNCEMENT READS
-- ========================

-- Create a sent announcement first
SELECT tests.authenticate_as('misc_editor');
INSERT INTO announcements (id, event_id, author_id, subject, body, status)
  VALUES (
    'e0000000-0000-0000-0000-000000000006'::uuid,
    (SELECT id FROM events WHERE slug = 'misc-event'),
    tests.get_supabase_uid('misc_editor'),
    'Test Announcement', 'Body text', 'sent'
  );

-- T19: Attendee can mark announcement as read
SELECT tests.authenticate_as('misc_attendee');
SELECT lives_ok(
  $$ INSERT INTO announcement_reads (announcement_id, user_id)
     VALUES (
       'e0000000-0000-0000-0000-000000000006'::uuid,
       tests.get_supabase_uid('misc_attendee')
     ) $$,
  'Attendee can mark announcement as read'
);

-- T20: User can view own announcement reads
SELECT isnt_empty(
  $$ SELECT announcement_id FROM announcement_reads
     WHERE user_id = tests.get_supabase_uid('misc_attendee') $$,
  'User can view own announcement reads'
);

SELECT * FROM finish();
ROLLBACK;
