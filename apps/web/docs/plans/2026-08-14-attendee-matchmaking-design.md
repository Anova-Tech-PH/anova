# Attendee Matchmaking — Design Document

**Date:** 2026-08-14
**Status:** Approved
**Approach:** Interest-tag matching (Approach 1)

## Goal

Help attendees form meaningful connections at events by matching them based on shared interests defined by the organizer. Includes a simple async messaging system for matched attendees to communicate.

## Scope

- Organizer-only interest management (attendees cannot create interests)
- Interest-based matching only (no profile-based scoring)
- Simple async DMs (no real-time, no read receipts)
- Lives under Community in both organizer and attendee nav

## Data Model

### event_interests
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| name | text | max 30 chars |
| sort_order | int | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### attendee_interests
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| user_id | uuid FK → auth.users | |
| interest_id | uuid FK → event_interests | CASCADE delete |
| created_at | timestamptz | |
| | UNIQUE | (user_id, interest_id) |

### attendee_messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| sender_id | uuid FK → auth.users | |
| recipient_id | uuid FK → auth.users | |
| content | text | |
| read_at | timestamptz | nullable |
| created_at | timestamptz | |

Indexes on attendee_messages: (event_id, recipient_id, created_at), (event_id, sender_id, created_at)

### RLS Policies
- **event_interests:** authenticated can read, org members can write
- **attendee_interests:** attendees can read all for their event, insert/delete own
- **attendee_messages:** sender/recipient can read own, authenticated can insert

## Organizer Dashboard

**Route:** `/events/{eventId}/matchmaking`
**Sidebar:** Engagement > Community > Attendee Matchmaking

### Page Layout
- Header with title and description
- Stats cards: interests defined, attendees participating, matches made
- Action buttons: "Generate interests" (AI), "+ Add interest"
- Interests table: name, attendee count, edit/delete actions

### Add/Edit Interest
- Modal with interest name field (max 30 chars)
- Save/Cancel buttons

### AI Interest Generation
- Server action reads event sessions/title/description
- Calls Claude API to suggest up to 10 interests
- Preview modal where organizer can check/uncheck before saving
- Disabled if no sessions exist

## Attendee Experience

### Interest Selection (`/events/{eventSlug}/matchmaking`)
- Under Community nav
- Event interests displayed as selectable chips/tags
- Toggle on/off, saved immediately
- Matches auto-display below after selecting

### Matches List
- Ranked by shared interest count (descending)
- Match card: name, photo, shared interest badges, "Message" button
- Transparency: "You both like: AI, Sustainability"
- Empty state if no interests selected

### Profile View
- Tap match card for full profile
- Name, email, bio, all selected interests
- "Send Message" button

### Inbox (`/events/{eventSlug}/messages`)
- Conversations grouped by person
- Name, last message preview, unread badge
- Thread view: chronological messages, text input to reply
- No read receipts, no typing indicators

## Matching Algorithm

Single SQL query using `attendee_interests` self-join:
1. Find all users sharing at least 1 interest with current user for this event
2. COUNT shared interests per user
3. ORDER BY count DESC
4. LIMIT 50

## File Structure

```
src/features/matchmaking/
├── queries.ts
├── actions.ts
├── actions.test.ts
├── components/
│   ├── matchmaking-page-client.tsx
│   ├── matchmaking-page-client.test.tsx
│   ├── interest-composer.tsx
│   ├── interest-composer.test.tsx
│   ├── generate-interests-dialog.tsx
│   └── generate-interests-dialog.test.tsx

Organizer route:
  src/app/(organizer)/events/[eventId]/matchmaking/page.tsx

Attendee routes:
  src/app/(attendee)/[orgSlug]/[eventSlug]/matchmaking/page.tsx
  src/app/(attendee)/[orgSlug]/[eventSlug]/messages/page.tsx
  src/app/(attendee)/[orgSlug]/[eventSlug]/messages/[userId]/page.tsx
```

## Navigation Integration

**Organizer sidebar:** Add "Attendee Matchmaking" under Community children
**Attendee nav:** Add "Matchmaking" under Community, "Messages" as top-level item with unread badge

## Dependencies

- No new packages required
- Claude API for interest generation (server action, `@anthropic-ai/sdk` or direct fetch)
- Existing: Supabase, server actions, `@attendly/ui/components`

## Out of Scope (Future)

- Profile-based matching (job title, company, location)
- Connection requests (mutual follow)
- Meetup suggestions from matches
- Real-time messaging (Supabase Realtime)
- Read receipts, typing indicators
- Attendee-created interests
- Organizer match analytics dashboard
