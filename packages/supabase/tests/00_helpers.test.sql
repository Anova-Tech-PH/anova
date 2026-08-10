BEGIN;
SELECT plan(3);

SELECT tests.create_supabase_user('helper_test_user');

SELECT isnt(
  tests.get_supabase_uid('helper_test_user'),
  NULL::uuid,
  'create_supabase_user creates a user and get_supabase_uid finds them'
);

SELECT lives_ok(
  $$ SELECT tests.authenticate_as('helper_test_user') $$,
  'authenticate_as does not throw'
);

SELECT lives_ok(
  $$ SELECT tests.authenticate_as_anon() $$,
  'authenticate_as_anon does not throw'
);

SELECT * FROM finish();
ROLLBACK;
