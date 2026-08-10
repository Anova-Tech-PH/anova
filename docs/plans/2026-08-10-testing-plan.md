# Attendly Testing Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use the `attendly-testing` skill for test patterns and conventions.

**Goal:** Add comprehensive test coverage across the Attendly monorepo, prioritizing server actions and RLS policies.

**Architecture:** Vitest for unit/integration tests (already configured), pgTAP for database/RLS tests, Playwright for E2E. Tests collocated next to source files.

**Tech Stack:** Vitest 3.2, @testing-library/react, MSW 2.x, pgTAP, Playwright

**Scope:** 63 server actions, 102+ RLS policies, 5 Zod schemas, key components

---

## Task 1: pgTAP Test Helpers Migration

**Files:**
- Create: `packages/supabase/migrations/031_test_helpers.sql`
- Create: `packages/supabase/tests/00_helpers.test.sql`

**Step 1: Write the test helpers migration**

```sql
-- packages/supabase/migrations/031_test_helpers.sql
CREATE SCHEMA IF NOT EXISTS tests;

CREATE OR REPLACE FUNCTION tests.create_supabase_user(
  identifier text,
  email text DEFAULT null,
  phone text DEFAULT null
) RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, role, aud, email, phone,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    COALESCE(email, identifier || '@test.com'), phone,
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('full_name', identifier)::jsonb,
    now(), now()
  );
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tests.authenticate_as(identifier text)
RETURNS void AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = identifier || '@test.com';
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.aud', 'authenticated', true);
  PERFORM set_config('role', 'authenticated', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tests.get_supabase_uid(identifier text)
RETURNS uuid AS $$
  SELECT id FROM auth.users WHERE email = identifier || '@test.com';
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tests.authenticate_as_anon()
RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('role', 'anon', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tests.create_test_org(
  owner_identifier text,
  org_name text DEFAULT 'Test Org',
  org_slug text DEFAULT 'test-org'
) RETURNS uuid AS $$
DECLARE
  org_id uuid;
  owner_id uuid;
BEGIN
  owner_id := tests.get_supabase_uid(owner_identifier);
  org_id := gen_random_uuid();
  INSERT INTO organizations (id, name, slug) VALUES (org_id, org_name, org_slug);
  INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (org_id, owner_id, 'owner');
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tests.create_test_event(
  org_id uuid,
  event_title text DEFAULT 'Test Event',
  event_slug text DEFAULT 'test-event',
  event_status text DEFAULT 'published'
) RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  event_id := gen_random_uuid();
  INSERT INTO events (id, organization_id, title, slug, status, start_date, end_date, timezone)
    VALUES (event_id, org_id, event_title, event_slug, event_status,
            now() + interval '7 days', now() + interval '8 days', 'UTC');
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION tests.register_attendee(
  event_id uuid,
  user_identifier text
) RETURNS uuid AS $$
DECLARE
  reg_id uuid;
  user_id uuid;
  tt_id uuid;
BEGIN
  user_id := tests.get_supabase_uid(user_identifier);
  SELECT id INTO tt_id FROM ticket_types WHERE ticket_types.event_id = register_attendee.event_id LIMIT 1;
  IF tt_id IS NULL THEN
    tt_id := gen_random_uuid();
    INSERT INTO ticket_types (id, event_id, name, price, currency, quantity_total)
      VALUES (tt_id, event_id, 'General', 0, 'USD', 100);
  END IF;
  reg_id := gen_random_uuid();
  INSERT INTO registrations (id, event_id, user_id, ticket_type_id, status)
    VALUES (reg_id, event_id, user_id, tt_id, 'confirmed');
  RETURN reg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Apply migration**

Run: `npx supabase migration up`

**Step 3: Write a smoke test to verify helpers work**

```sql
-- packages/supabase/tests/00_helpers.test.sql
BEGIN;
SELECT plan(3);

SELECT tests.create_supabase_user('helper_test_user');

SELECT isnt(
  tests.get_supabase_uid('helper_test_user'),
  NULL,
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
```

**Step 4: Run**

Run: `npx supabase test db`
Expected: 3 tests pass

**Step 5: Commit**

```bash
git add packages/supabase/migrations/031_test_helpers.sql packages/supabase/tests/00_helpers.test.sql
git commit -m "feat: add pgTAP test helpers and smoke test"
```

---

## Task 2: RLS Tests — Organizations & Profiles

**Files:**
- Create: `packages/supabase/tests/rls-organizations.test.sql`
- Create: `packages/supabase/tests/rls-profiles.test.sql`

**Step 1: Write organization RLS tests**

```sql
-- packages/supabase/tests/rls-organizations.test.sql
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
  'Outsider cannot add members to org'
);

SELECT * FROM finish();
ROLLBACK;
```

**Step 2: Write profile RLS tests**

```sql
-- packages/supabase/tests/rls-profiles.test.sql
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
```

**Step 3: Run**

Run: `npx supabase test db`
Expected: 15 tests pass (3 helpers + 8 orgs + 4 profiles)

**Step 4: Commit**

```bash
git add packages/supabase/tests/rls-organizations.test.sql packages/supabase/tests/rls-profiles.test.sql
git commit -m "test: add RLS tests for organizations and profiles"
```

---

## Task 3: RLS Tests — Events, Tracks, Speakers, Sessions

**Files:**
- Create: `packages/supabase/tests/rls-events.test.sql`

Test coverage:
- Published events visible to anon, draft events only to org members
- Editors can CRUD events, viewers cannot
- Admins can delete events
- Tracks/speakers/sessions follow event visibility
- Session speakers follow visibility rules

**12-15 test assertions covering:**
- Anon sees published event, not draft
- Org editor can create/update event
- Org viewer cannot create event
- Outsider cannot modify event
- Tracks/speakers/sessions inherit event visibility
- Editor can CRUD tracks, speakers, sessions

---

## Task 4: RLS Tests — Tickets, Registrations, Bookmarks

**Files:**
- Create: `packages/supabase/tests/rls-registrations.test.sql`

Test coverage:
- Ticket types visible for published events
- Anyone can register for published events
- Users can only view own registrations (+ org members see all)
- Editors can update registration status
- Attendees cannot see other attendees' registrations
- Session bookmarks are user-scoped

**10-12 test assertions**

---

## Task 5: RLS Tests — Phase 1 Engagement (Announcements, Feedback, Polls, RSVP)

**Files:**
- Create: `packages/supabase/tests/rls-announcements.test.sql`
- Create: `packages/supabase/tests/rls-feedback.test.sql`
- Create: `packages/supabase/tests/rls-polls.test.sql`
- Create: `packages/supabase/tests/rls-rsvp.test.sql`

**Announcements (8 tests):**
- Editor can create/update/delete/send announcements
- Attendee can view sent announcements only (not drafts)
- Attendee cannot create announcements
- User can mark own reads, cannot mark others'
- Read count trigger fires correctly

**Feedback (8 tests):**
- Editor can CRUD feedback forms
- Attendee can view forms for published events
- Attendee can submit feedback (one per session)
- Duplicate submission blocked by unique constraint
- Org members can view all feedback
- Speakers can view feedback for their sessions only

**Polls (10 tests):**
- Editor can CRUD polls
- Speaker can create poll for their session
- Attendee can view open/closed polls (not drafts)
- Attendee can vote (one per poll)
- Attendee can change vote
- Org member can view all votes
- User can view own votes

**RSVP (8 tests):**
- `rsvp_to_session` RPC confirms when under capacity
- `rsvp_to_session` RPC waitlists when at capacity
- `cancel_session_rsvp` RPC promotes waitlisted user
- Attendee can manage own RSVPs
- Org member can view all RSVPs

---

## Task 6: RLS Tests — Social, Messaging, Breakout Rooms

**Files:**
- Create: `packages/supabase/tests/rls-social.test.sql`
- Create: `packages/supabase/tests/rls-messaging.test.sql`
- Create: `packages/supabase/tests/rls-rooms.test.sql`

**Social (10 tests):**
- Only event attendees can view/create posts
- Authors can update/delete own posts
- Others cannot modify posts
- Like/comment visibility and ownership
- Connection request ownership rules

**Messaging (8 tests):**
- Only conversation members can view messages
- Only members can send messages
- `create_dm_conversation` RPC deduplicates
- Non-attendee cannot create conversations

**Breakout Rooms (8 tests):**
- Rooms visible for published events
- Only editors can create/update/delete rooms
- Only attendees can join rooms
- Users can only leave (delete) their own participation

---

## Task 7: RLS Tests — Remaining Tables

**Files:**
- Create: `packages/supabase/tests/rls-misc.test.sql`

Covers: email_templates, email_logs, email_automations, custom_registration_fields, promo_codes, surveys, survey_responses, event_templates, push_tokens, check_ins

**15 tests** covering the key boundaries for each table.

---

## Task 8: Server Action Tests — Events & Schedule

**Files:**
- Create: `apps/web/src/features/events/actions.test.ts`
- Create: `apps/web/src/features/schedule/actions.test.ts`

**Events actions (6 tests):**
- `updateEventStatus` — changes status and revalidates
- `updateEventStatus` — rejects invalid status
- `deleteEvent` — deletes event
- `deleteEvent` — returns error for non-existent event
- `duplicateEvent` — creates copy with new slug
- `duplicateEvent` — handles missing event

**Schedule actions (8 tests):**
- `createTrack` — creates with valid data
- `createSession` — creates with speakers
- `createSession` — rejects missing title
- `updateSession` — updates fields and speakers
- `updateSession` — handles capacity/rsvp_enabled fields
- `deleteSession` — removes session
- `deleteTrack` — removes track
- `updateTrack` — updates name/color

Each test mocks `createClient` from `@attendly/ui/supabase/server` and `revalidatePath` from `next/cache`. Asserts on return values and mock calls.

---

## Task 9: Server Action Tests — Registration & Tickets

**Files:**
- Create: `apps/web/src/features/registration/actions.test.ts`
- Create: `apps/web/src/features/tickets/actions.test.ts`

**Registration actions (6 tests):**
- `registerForEvent` — successful registration with ticket
- `registerForEvent` — applies promo code discount
- `registerForEvent` — rejects sold-out ticket
- `checkInByQrCode` — successful check-in
- `checkInByQrCode` — rejects invalid QR
- `updateRegistrationStatus` — changes status

**Ticket actions (5 tests):**
- `createTicketType` — creates free/paid ticket
- `updateTicketType` — updates price/quantity
- `deleteTicketType` — blocks deletion when registrations exist
- `deleteTicketType` — allows deletion when no registrations

---

## Task 10: Server Action Tests — Announcements, Feedback, Polls, RSVP

**Files:**
- Create: `apps/web/src/features/announcements/actions.test.ts`
- Create: `apps/web/src/features/feedback/actions.test.ts`
- Create: `apps/web/src/features/polls/actions.test.ts`
- Create: `apps/web/src/features/rsvp/actions.test.ts`

**Announcements (6 tests):**
- `createAnnouncement` — creates draft
- `sendAnnouncement` — updates status to sent
- `sendAnnouncement` — sends email when email channel selected
- `updateAnnouncement` — modifies draft
- `deleteAnnouncement` — removes announcement
- `markAnnouncementRead` — upserts read record

**Feedback (5 tests):**
- `createFeedbackForm` — creates with questions JSONB
- `updateFeedbackForm` — updates questions
- `assignFeedbackForm` — links form to session
- `submitSessionFeedback` — stores answers
- `deleteFeedbackForm` — removes form

**Polls (7 tests):**
- `createPoll` — creates with options
- `openPoll` — changes status to open
- `closePoll` — changes status to closed
- `togglePollResults` — toggles show_results
- `votePoll` — records vote
- `votePoll` — upserts (changes vote)
- `deletePoll` — removes poll

**RSVP (4 tests):**
- `rsvpToSession` — calls RPC
- `cancelRsvp` — calls cancel RPC
- `updateSessionCapacity` — sets capacity and rsvp_enabled

---

## Task 11: Server Action Tests — Team, Emails, Promo Codes, Surveys

**Files:**
- Create: `apps/web/src/features/team/actions.test.ts`
- Create: `apps/web/src/features/emails/actions.test.ts`
- Create: `apps/web/src/features/promo-codes/actions.test.ts`
- Create: `apps/web/src/features/surveys/actions.test.ts`

**Team (4 tests):**
- `inviteTeamMember` — adds member with role
- `updateMemberRole` — changes role
- `removeMember` — removes member
- `removeMember` — prevents removing self

**Emails (5 tests):**
- `createEmailTemplate` — creates template
- `sendBroadcastEmail` — sends to filtered recipients
- `createEmailAutomation` — creates automation
- `toggleEmailAutomation` — toggles active
- `deleteEmailTemplate` — removes template

**Promo Codes (4 tests):**
- `createPromoCode` — creates with discount
- `validatePromoCode` — validates active code
- `validatePromoCode` — rejects expired code
- `deletePromoCode` — removes code

**Surveys (4 tests):**
- `createOrUpdateSurvey` — creates/updates survey
- `submitSurveyResponse` — records response
- `toggleSurveyActive` — toggles active

---

## Task 12: Server Action Tests — Attendee App

**Files:**
- Create: `apps/web/src/features/attendee/actions.test.ts`
- Create: `apps/web/src/features/breakout-rooms/actions.test.ts`
- Create: `apps/web/src/features/templates/actions.test.ts`

**Attendee (4 tests):**
- `createAttendeeAccount` — creates account and links registrations
- `toggleSessionBookmark` — adds/removes bookmark
- `updateMyProfile` — updates profile

**Breakout Rooms (5 tests):**
- `createRoom` — creates room
- `joinRoom` — joins with capacity check
- `joinRoom` — rejects when full
- `leaveRoom` — leaves and auto-reopens room
- `deleteRoom` — removes room

**Templates (3 tests):**
- `saveAsTemplate` — saves event as template
- `createEventFromTemplate` — creates event from template
- `deleteTemplate` — removes template

---

## Task 13: Zod Schema Tests (remaining)

**Files:**
- Create: `packages/shared/src/schemas/registration.test.ts`
- Create: `packages/shared/src/schemas/user.test.ts`
- Create: `packages/shared/src/schemas/social.test.ts`
- Create: `packages/shared/src/schemas/email.test.ts`

**Registration (8 tests):**
- `createTicketTypeSchema` — valid/invalid ticket data
- `registerSchema` — valid registration, missing fields
- `checkInSchema` — valid QR data

**User (6 tests):**
- `signUpSchema` — valid signup, password too short
- `loginSchema` — valid login, invalid email
- `updateProfileSchema` — partial updates

**Social (6 tests):**
- `createPostSchema` — valid post, empty content
- `sendMessageSchema` — valid message
- `createConversationSchema` — valid conversation

**Email (5 tests):**
- `createEmailTemplateSchema` — valid template
- `sendBroadcastSchema` — valid broadcast with filters
- `createAutomationSchema` — valid automation

---

## Task 14: Component Tests — Key Interactive Components

**Files:**
- Create: `apps/web/src/features/feedback/components/feedback-form-builder.test.tsx`
- Create: `apps/web/src/features/polls/components/poll-creator.test.tsx`
- Create: `apps/web/src/features/rsvp/components/rsvp-button.test.tsx`
- Create: `apps/web/src/features/schedule/components/session-form.test.tsx`

**Feedback Form Builder (5 tests):**
- Renders default questions
- Adds new question
- Removes question
- Changes question type (shows options for multiple_choice)
- Reorders questions

**Poll Creator (4 tests):**
- Renders question and option fields
- Disables submit with < 2 options
- Adds/removes options
- Session dropdown populated

**RSVP Button (4 tests):**
- Shows "RSVP" when not rsvp'd
- Shows "Cancel RSVP" when rsvp'd
- Shows "Join Waitlist" when at capacity
- Displays headcount

**Session Form (3 tests):**
- Renders all fields
- RSVP checkbox shows capacity field
- Capacity field hidden when RSVP disabled

---

## Task 15: Attendee App Component Tests

**Files:**
- Create: `apps/attendee/src/features/social/components/*.test.tsx` (key components)
- Create: `apps/attendee/src/features/messaging/components/*.test.tsx` (key components)

Test the main interactive components in the attendee app (post composer, message list, etc.). 3-4 tests per component covering render + interaction.

---

## Summary

| Task | Type | Tests | Priority |
|------|------|-------|----------|
| 1 | pgTAP helpers | 3 | P0 — Prerequisite |
| 2 | RLS: Orgs & Profiles | 12 | P0 |
| 3 | RLS: Events/Schedule | 14 | P0 |
| 4 | RLS: Tickets/Registration | 11 | P0 |
| 5 | RLS: Phase 1 Engagement | 34 | P0 |
| 6 | RLS: Social/Messaging/Rooms | 26 | P1 |
| 7 | RLS: Misc tables | 15 | P1 |
| 8 | Actions: Events/Schedule | 14 | P0 |
| 9 | Actions: Registration/Tickets | 11 | P0 |
| 10 | Actions: Phase 1 Engagement | 22 | P0 |
| 11 | Actions: Team/Emails/Promo/Surveys | 17 | P1 |
| 12 | Actions: Attendee/Rooms/Templates | 12 | P1 |
| 13 | Zod schemas | 25 | P1 |
| 14 | Components: Web app | 16 | P2 |
| 15 | Components: Attendee app | 8 | P2 |

**Total: ~240 tests across 15 tasks**

**P0 (do first):** Tasks 1-5, 8-10 = ~121 tests (RLS + critical server actions)
**P1 (do next):** Tasks 6-7, 11-13 = ~95 tests (remaining RLS + actions + schemas)
**P2 (do last):** Tasks 14-15 = ~24 tests (component tests)
