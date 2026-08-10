BEGIN;
SELECT plan(8);

-- Setup: create users
SELECT tests.create_supabase_user('org_owner');
SELECT tests.create_supabase_user('org_member');
SELECT tests.create_supabase_user('outsider');

-- Setup: create org with owner
SELECT tests.authenticate_as('org_owner');
SELECT tests.create_test_org('org_owner', 'RLS Test Org', 'rls-test-org');

-- Add member as viewer
INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (
    (SELECT id FROM organizations WHERE slug = 'rls-test-org'),
    tests.get_supabase_uid('org_member'),
    'viewer'
  );

-- T1: Anon can view organizations
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM organizations WHERE slug = 'rls-test-org' $$,
  'Anon can SELECT organizations'
);

-- T2: Owner can update organization
SELECT tests.authenticate_as('org_owner');
SELECT lives_ok(
  $$ UPDATE organizations SET name = 'Updated Org' WHERE slug = 'rls-test-org' $$,
  'Owner can update organization'
);

-- T3: Viewer cannot update organization
SELECT tests.authenticate_as('org_member');
SELECT results_eq(
  $$ UPDATE organizations SET name = 'Hacked' WHERE slug = 'rls-test-org' RETURNING id $$,
  $$ SELECT id FROM organizations WHERE false $$,
  'Viewer cannot update organization'
);

-- T4: Members can view org members
SELECT tests.authenticate_as('org_member');
SELECT isnt_empty(
  $$ SELECT user_id FROM organization_members
     WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'rls-test-org') $$,
  'Member can view org members'
);

-- T5: Outsider cannot view org members
SELECT tests.authenticate_as('outsider');
SELECT is_empty(
  $$ SELECT user_id FROM organization_members
     WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'rls-test-org') $$,
  'Outsider cannot view org members'
);

-- T6: Owner can manage members (admin policy)
SELECT tests.authenticate_as('org_owner');
SELECT lives_ok(
  $$ UPDATE organization_members SET role = 'editor'
     WHERE user_id = tests.get_supabase_uid('org_member')
     AND organization_id = (SELECT id FROM organizations WHERE slug = 'rls-test-org') $$,
  'Owner can update member roles'
);

-- T7: Viewer cannot manage other members
SELECT tests.authenticate_as('org_member');
SELECT results_eq(
  $$ DELETE FROM organization_members
     WHERE user_id = tests.get_supabase_uid('org_owner')
     AND organization_id = (SELECT id FROM organizations WHERE slug = 'rls-test-org')
     RETURNING user_id $$,
  $$ SELECT user_id FROM organization_members WHERE false $$,
  'Viewer cannot delete other members'
);

-- T8: Outsider cannot insert into org_members for others
SELECT tests.authenticate_as('outsider');
SELECT throws_ok(
  $$ INSERT INTO organization_members (organization_id, user_id, role)
     VALUES (
       (SELECT id FROM organizations WHERE slug = 'rls-test-org'),
       tests.get_supabase_uid('org_owner'),
       'admin'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "organization_members"',
  'Outsider cannot add members to org'
);

SELECT * FROM finish();
ROLLBACK;
