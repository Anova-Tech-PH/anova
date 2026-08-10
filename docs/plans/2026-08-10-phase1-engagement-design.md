# Phase 1: Core Event Experience — Design Document

Based on Whova feature audit. Four features: Announcements, Session Feedback, Live Polling, Session RSVP + Capacity.

---

## 1. Announcements (Web + Email + Mobile Push)

Organizer-to-attendee broadcast messaging. Distinct from social feed posts (attendee-to-attendee).

### Organizer Dashboard (web app)

New "Announcements" tab under each event at `/events/[eventId]/announcements`.

- **Compose**: subject + rich text body (reuse TipTap/textarea pattern from email templates)
- **Target audience**: All attendees | By ticket type
- **Delivery channels** (checkboxes): In-app notification, Email, Push notification
- **Save as draft** or **Send immediately**
- **Sent history**: table with subject, target, sent date, delivery stats (read count)
- **Schedule send**: optional future send time

### Attendee Experience

- **Notification bell** in attendee app header with unread badge count
- **Notifications page** listing all announcements for events the user is registered for
- **Real-time delivery** via Supabase Realtime broadcast on channel `event:{eventId}:announcements`
- **Email** sent via existing Resend infrastructure (email_templates + email_logs)
- **Push** via Expo Push API using existing `push_tokens` table

### Database Schema

```sql
-- Announcements from organizers to attendees
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  -- target_audience examples:
  --   {"type": "all"}
  --   {"type": "ticket_types", "ticket_type_ids": ["uuid1", "uuid2"]}
  channels TEXT[] NOT NULL DEFAULT '{in_app}',
  -- channels: 'in_app', 'email', 'push'
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which attendees have read each announcement
CREATE TABLE public.announcement_reads (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
```

### RLS

- Organizers (editors+) can CRUD announcements for their events
- Registered attendees can SELECT sent announcements for their events
- Users can INSERT/SELECT their own announcement_reads
- Trigger to increment `read_count` on announcement_reads insert

---

## 2. Session Feedback (Structured, Whova-style)

Per-session feedback forms with customizable questions. Whova charges $1,200 for this — we include it free.

### Organizer Dashboard

New "Session Feedback" tab under event at `/events/[eventId]/feedback`.

- **Default feedback form**: auto-created per event with standard questions (overall rating, speaker rating, comments)
- **Custom forms**: organizer can create multiple forms (e.g. "Keynote Feedback", "Workshop Feedback")
- **Questions stored as JSONB** array (same pattern as `surveys.questions`):
  ```json
  [
    {"id": "q1", "type": "rating", "label": "Overall session rating", "required": true},
    {"id": "q2", "type": "rating", "label": "Speaker effectiveness", "required": true},
    {"id": "q3", "type": "multiple_choice", "label": "Would you attend again?", "options": ["Yes", "No", "Maybe"]},
    {"id": "q4", "type": "text", "label": "Comments or suggestions", "required": false}
  ]
  ```
- **Assign form to sessions**: per-session or by session type (talk/workshop/keynote)
- **Results view**: aggregated ratings per session, per speaker, per question. Exportable.

### Attendee Experience

- "Give Feedback" button on session detail page (visible after session's end_time)
- Shows the assigned form's questions
- One submission per attendee per session (enforced by unique constraint)
- Optional: prompt via push notification 15 min after session ends

### Database Schema

```sql
-- Feedback forms (templates per event)
CREATE TABLE public.feedback_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Feedback',
  questions JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link sessions to feedback forms (nullable = uses event default)
-- Add column to sessions table:
ALTER TABLE public.sessions ADD COLUMN feedback_form_id UUID REFERENCES public.feedback_forms(id) ON DELETE SET NULL;

-- Session feedback responses
CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_form_id UUID NOT NULL REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  -- answers example: {"q1": 5, "q2": 4, "q3": "Yes", "q4": "Great talk!"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
```

### RLS

- Organizers (editors+) can CRUD feedback_forms
- Registered attendees can SELECT feedback_forms for published events
- Attendees can INSERT session_feedback (one per session)
- Organizers can SELECT all session_feedback for their events
- Speakers can SELECT feedback for their own sessions (via session_speakers join)

---

## 3. Live Polling

Real-time polls during sessions. Organizers and speakers can create polls.

**Note:** Table names prefixed with `live_` to avoid conflict with existing `poll_votes` table (social feed polls in 006_social.sql).

### Organizer Dashboard

New "Live Polls" tab under event at `/events/[eventId]/polls`.

- **Create poll**: question + multiple choice options (2-8 options)
- **Associate with session** (optional but recommended)
- **Controls**: Open/Close poll, Show/Hide results to attendees
- **Results view**: bar chart with vote counts + percentages, downloadable

### Speaker Portal

- Speakers with linked user accounts can create polls for their assigned sessions
- Access via attendee app or a dedicated speaker URL
- Requires adding `user_id` to `speakers` table

### Attendee Experience

- Active poll appears as a banner/card on the session detail page
- One vote per poll (can change vote while poll is open)
- Live results update via Supabase Realtime on channel `event:{eventId}:polls`
- Results visible after voting (or when organizer enables "show results")

### Database Schema

```sql
-- Add user_id to speakers for speaker portal auth
ALTER TABLE public.speakers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Live polls (distinct from social feed polls)
CREATE TABLE public.live_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  -- options: [{"id": "a", "text": "Option A"}, {"id": "b", "text": "Option B"}]
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  show_results BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live poll votes
CREATE TABLE public.live_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
```

### RLS

- Organizers (editors+) can CRUD live_polls
- Speakers can INSERT/UPDATE live_polls for their assigned sessions (via session_speakers + speakers.user_id)
- Registered attendees can SELECT open/closed polls
- Attendees can INSERT/UPDATE their own vote (one per poll)
- Organizers can SELECT all votes

### Realtime

- Channel: `event:{eventId}:polls`
- Broadcast events: `poll_opened`, `poll_closed`, `poll_results_updated`
- Vote counts aggregated server-side, broadcast as summary (not individual votes)

---

## 4. Session RSVP + Capacity

Combined RSVP (soft headcount) and capacity cap (hard limit with waitlist). Whova charges $1,200 for capacity — we include it free.

**Note:** Separate from existing `session_bookmarks` (personal reminders). RSVP is a commitment visible to organizers.

### Organizer Dashboard

Changes to existing schedule editor at `/events/[eventId]/schedule`:

- **Per-session capacity** field (optional number input)
- **RSVP toggle** per session (enable/disable RSVP)
- **RSVP dashboard**: headcount per session, attendee list, export
- **Waitlist management**: view waitlisted attendees, manually promote

### Attendee Experience

- "RSVP" button on each session card/detail page (when RSVP enabled)
- Shows: "42/50 seats" or "42 attending" (no cap)
- When session has capacity and is full: "Join Waitlist" button
- Auto-promotion: when someone cancels, next waitlisted attendee is promoted + notified
- RSVP is optional, not required during event registration (per Whova's pattern)

### Database Schema

```sql
-- Add capacity and RSVP toggle to sessions
ALTER TABLE public.sessions ADD COLUMN capacity INT;
ALTER TABLE public.sessions ADD COLUMN rsvp_enabled BOOLEAN NOT NULL DEFAULT false;

-- Session RSVPs (distinct from session_bookmarks)
CREATE TABLE public.session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),
  waitlist_position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
```

### RLS

- Organizers (editors+) can SELECT all RSVPs, UPDATE status
- Attendees can INSERT/UPDATE/DELETE their own RSVPs
- Attendees can SELECT RSVP counts (aggregated) for published event sessions

### Capacity Enforcement

- INSERT trigger on session_rsvps: if session has capacity and confirmed count >= capacity, set status to 'waitlisted' with next waitlist_position
- DELETE/UPDATE trigger: when a confirmed RSVP is cancelled, promote the lowest waitlist_position to 'confirmed' and send notification

---

## Shared Infrastructure

### Supabase Realtime Channels

| Channel Pattern | Events | Used By |
|----------------|--------|---------|
| `event:{eventId}:announcements` | `new_announcement` | Announcements |
| `event:{eventId}:polls` | `poll_opened`, `poll_closed`, `vote_update` | Live Polling |

### Notification System

Reusable across features. Three delivery channels:

1. **In-app**: Insert into announcements table + Realtime broadcast
2. **Email**: Use existing `email_logs` + Resend integration
3. **Push**: Use existing `push_tokens` table + Expo Push API edge function

### Speaker Portal Auth

Adding `user_id` to `speakers` table enables:
- Speaker sign-in links their account to speaker profile
- Speaker can create polls for their sessions
- Speaker can view feedback for their sessions
- No separate speaker app needed — works through attendee app with elevated permissions

---

## Migration Plan

Single migration file `030_phase1_engagement.sql` containing:
1. `announcements` + `announcement_reads` tables
2. `feedback_forms` table + `sessions.feedback_form_id` column
3. `session_feedback` table
4. `speakers.user_id` column
5. `live_polls` + `live_poll_votes` tables
6. `sessions.capacity` + `sessions.rsvp_enabled` columns
7. `session_rsvps` table
8. All RLS policies, grants, indexes, and triggers

## New Pages

### Organizer (web app)
- `/events/[eventId]/announcements` — compose + history
- `/events/[eventId]/feedback` — forms + results
- `/events/[eventId]/polls` — create + manage + results

### Attendee (attendee app)
- `/notifications` — announcement inbox
- Session detail gets: feedback button, poll card, RSVP button
