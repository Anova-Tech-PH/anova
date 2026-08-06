# Attendee Account Feature Design

## Overview

After registering for an event, attendees can create an account by setting a password (name and email already provided during registration). This gives them a personal dashboard at `/my` to view tickets, manage their schedule, and edit their profile.

## Pages

### `/my` — My Tickets (default)
- List all registrations across events
- Each card shows: event name, date, ticket type, status badge, "Show QR" button
- Tapping a card expands or shows the QR code
- Empty state for no registrations

### `/my/schedule` — My Schedule
- Bookmarked sessions grouped by event, then by day
- Each session shows time, title, track, location, speakers
- Remove bookmark button on each entry
- Empty state: "Browse an event's schedule to save sessions"

### `/my/profile` — Profile
- Editable fields: full name, bio, company, job title, avatar URL
- Social links: LinkedIn URL, Twitter handle
- Tags: interests, looking_for (comma-separated input)
- Save button with toast confirmation

## Account Creation Flow

1. Attendee registers for event -> sees QR confirmation page
2. Below the QR code, a CTA appears: "Create an account to manage your tickets"
3. Clicking reveals a password field (name/email pre-filled from registration data)
4. On submit: calls Supabase `signUp` with email, password, and full_name in metadata
5. Registration's `user_id` is updated to link to the new account
6. User is redirected to `/my`

## Auth Integration

- **Middleware**: If user is logged in, has no org, and navigates to `/onboarding` -> redirect to `/my`
- **Middleware**: `/my/*` routes require authentication -> redirect to `/login?redirect=/my`
- **Public nav**: When logged in, show user avatar/initials with dropdown menu containing My Tickets, Profile, Sign out. When not logged in, show a "Sign in" link.
- **No role field**: Organizers can also access `/my` if they register for events. No schema migration needed for roles.

## Session Bookmarking

- Add bookmark toggle icon to each session on the public schedule page
- Only visible/functional when the user is logged in
- Uses existing `session_bookmarks` table (already created in migration 005)
- Server action to toggle bookmark on/off

## New Files

- `apps/web/src/app/(attendee)/layout.tsx` — Layout with nav header and auth guard
- `apps/web/src/app/(attendee)/my/page.tsx` — My Tickets page
- `apps/web/src/app/(attendee)/my/schedule/page.tsx` — My Schedule page
- `apps/web/src/app/(attendee)/my/profile/page.tsx` — Profile editor page
- `apps/web/src/features/attendee/actions.ts` — createAttendeeAccount, toggleBookmark, updateProfile
- `apps/web/src/features/attendee/queries.ts` — getMyRegistrations, getMyBookmarks, getMyProfile

## Modified Files

- `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/qr-confirmation.tsx` — Add account creation CTA
- `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx` — Add user menu when logged in
- `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/page.tsx` — Add bookmark toggle to sessions
- `apps/web/src/middleware.ts` — Add `/my` route protection and attendee routing logic

## Database

No new migrations required. All necessary tables already exist:
- `profiles` (002_profiles.sql) — full_name, bio, company, job_title, interests, looking_for, linkedin_url, twitter_handle
- `session_bookmarks` (005_tickets_registrations.sql) — user_id, session_id junction table
- `registrations` (005_tickets_registrations.sql) — user_id nullable field for linking accounts
