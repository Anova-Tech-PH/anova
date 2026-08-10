BEGIN;
SELECT plan(4);

SELECT tests.create_supabase_user('profile_user_a');
SELECT tests.create_supabase_user('profile_user_b');

-- T1: Anon can view profiles
SELECT tests.authenticate_as_anon();
SELECT isnt_empty(
  $$ SELECT id FROM profiles $$,
  'Anon can view profiles'
);

-- T2: User can update own profile
SELECT tests.authenticate_as('profile_user_a');
SELECT lives_ok(
  $$ UPDATE profiles SET full_name = 'Updated Name'
     WHERE id = tests.get_supabase_uid('profile_user_a') $$,
  'User can update own profile'
);

-- T3: User cannot update other profile
SELECT tests.authenticate_as('profile_user_a');
SELECT results_eq(
  $$ UPDATE profiles SET full_name = 'Hacked'
     WHERE id = tests.get_supabase_uid('profile_user_b') RETURNING id $$,
  $$ SELECT id FROM profiles WHERE false $$,
  'User cannot update other user profile'
);

-- T4: User can insert own profile (idempotent — may already exist from trigger)
SELECT tests.authenticate_as('profile_user_a');
SELECT lives_ok(
  $$ INSERT INTO profiles (id, full_name)
     VALUES (tests.get_supabase_uid('profile_user_a'), 'Test')
     ON CONFLICT (id) DO UPDATE SET full_name = 'Test' $$,
  'User can upsert own profile'
);

SELECT * FROM finish();
ROLLBACK;
