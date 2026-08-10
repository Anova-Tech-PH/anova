# Phase 1: Engagement Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Announcements, Session Feedback, Live Polling, and Session RSVP + Capacity to the Attendly organizer dashboard and attendee app.

**Architecture:** Each feature follows the existing feature module pattern: `src/features/{name}/actions.ts`, `queries.ts`, `components/`. Server Actions for mutations, server-side Supabase client for queries. Supabase Realtime for live updates. All four features share a single migration.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres + RLS + Realtime), Tailwind CSS 4, Resend (email), Expo Push API (push notifications)

---

## Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/030_phase1_engagement.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- Phase 1: Engagement Features
-- Announcements, Session Feedback, Live Polling, Session RSVP
-- ============================================================

-- =====================
-- 1. ANNOUNCEMENTS
-- =====================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  channels TEXT[] NOT NULL DEFAULT '{in_app}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_reads (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT ON public.announcement_reads TO authenticated;

-- Organizers can manage announcements
CREATE POLICY "Org members can manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = announcements.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = announcements.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Attendees can view sent announcements for events they're registered to
CREATE POLICY "Attendees can view sent announcements" ON public.announcements FOR SELECT TO authenticated
  USING (status = 'sent' AND is_event_attendee(event_id));

-- Users can manage their own reads
CREATE POLICY "Users can insert own reads" ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own reads" ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Trigger to increment read_count
CREATE OR REPLACE FUNCTION public.increment_announcement_read_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.announcements SET read_count = read_count + 1 WHERE id = NEW.announcement_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_announcement_read
  AFTER INSERT ON public.announcement_reads
  FOR EACH ROW EXECUTE FUNCTION public.increment_announcement_read_count();

CREATE INDEX idx_announcements_event ON public.announcements(event_id);
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads(user_id);

-- =====================
-- 2. SESSION FEEDBACK
-- =====================

CREATE TABLE public.feedback_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Feedback',
  questions JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS feedback_form_id UUID REFERENCES public.feedback_forms(id) ON DELETE SET NULL;

CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_form_id UUID NOT NULL REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_forms TO authenticated;
GRANT SELECT, INSERT ON public.session_feedback TO authenticated;

-- Organizers can manage feedback forms
CREATE POLICY "Org members can manage feedback forms" ON public.feedback_forms FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = feedback_forms.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = feedback_forms.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Attendees can view feedback forms for published events
CREATE POLICY "Attendees can view feedback forms" ON public.feedback_forms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = feedback_forms.event_id
    AND e.status IN ('published', 'completed') AND is_event_attendee(e.id)
  ));

-- Attendees can submit feedback
CREATE POLICY "Attendees can submit session feedback" ON public.session_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Organizers can view all feedback
CREATE POLICY "Org members can view session feedback" ON public.session_feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_feedback.session_id AND is_org_member(e.organization_id)
  ));

-- Speakers can view feedback for their sessions
CREATE POLICY "Speakers can view own session feedback" ON public.session_feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
    WHERE ss.session_id = session_feedback.session_id AND sp.user_id = auth.uid()
  ));

CREATE INDEX idx_feedback_forms_event ON public.feedback_forms(event_id);
CREATE INDEX idx_session_feedback_session ON public.session_feedback(session_id);

-- =====================
-- 3. LIVE POLLING
-- =====================

-- Add user_id to speakers for speaker portal auth
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE public.live_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  show_results BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.live_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_polls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_poll_votes TO authenticated;

-- Organizers can manage polls
CREATE POLICY "Org members can manage live polls" ON public.live_polls FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = live_polls.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = live_polls.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Speakers can create/manage polls for their sessions
CREATE POLICY "Speakers can manage own session polls" ON public.live_polls FOR ALL TO authenticated
  USING (
    created_by = auth.uid() AND session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
      WHERE ss.session_id = live_polls.session_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
      WHERE ss.session_id = live_polls.session_id AND sp.user_id = auth.uid()
    )
  );

-- Attendees can view open/closed polls
CREATE POLICY "Attendees can view polls" ON public.live_polls FOR SELECT TO authenticated
  USING (status IN ('open', 'closed') AND is_event_attendee(event_id));

-- Attendees can vote (insert or update their vote)
CREATE POLICY "Attendees can vote" ON public.live_poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendees can change vote" ON public.live_poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Organizers can view all votes
CREATE POLICY "Org members can view votes" ON public.live_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM live_polls lp JOIN events e ON e.id = lp.event_id
    WHERE lp.id = live_poll_votes.poll_id AND is_org_member(e.organization_id)
  ));

-- Attendees can view own votes
CREATE POLICY "Users can view own votes" ON public.live_poll_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_live_polls_event ON public.live_polls(event_id);
CREATE INDEX idx_live_polls_session ON public.live_polls(session_id);
CREATE INDEX idx_live_poll_votes_poll ON public.live_poll_votes(poll_id);

-- =====================
-- 4. SESSION RSVP + CAPACITY
-- =====================

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS capacity INT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS rsvp_enabled BOOLEAN NOT NULL DEFAULT false;

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

ALTER TABLE public.session_rsvps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_rsvps TO authenticated;

-- Organizers can manage all RSVPs
CREATE POLICY "Org members can manage RSVPs" ON public.session_rsvps FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_rsvps.session_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_rsvps.session_id AND is_org_member(e.organization_id)
  ));

-- Attendees can manage their own RSVPs
CREATE POLICY "Attendees can manage own RSVPs" ON public.session_rsvps FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Attendees can view RSVP counts (via session visibility)
CREATE POLICY "Attendees can view RSVPs" ON public.session_rsvps FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_rsvps.session_id AND e.status = 'published'
  ));

-- Function to handle RSVP with capacity check
CREATE OR REPLACE FUNCTION public.rsvp_to_session(_session_id UUID)
RETURNS TEXT AS $$
DECLARE
  _capacity INT;
  _confirmed_count INT;
  _existing RECORD;
  _status TEXT;
  _waitlist_pos INT;
BEGIN
  -- Check if already RSVPed
  SELECT * INTO _existing FROM session_rsvps
    WHERE session_id = _session_id AND user_id = auth.uid();
  IF _existing IS NOT NULL AND _existing.status != 'cancelled' THEN
    RETURN _existing.status;
  END IF;

  -- Get session capacity
  SELECT capacity INTO _capacity FROM sessions WHERE id = _session_id;

  IF _capacity IS NOT NULL THEN
    SELECT count(*) INTO _confirmed_count FROM session_rsvps
      WHERE session_id = _session_id AND status = 'confirmed';

    IF _confirmed_count >= _capacity THEN
      SELECT coalesce(max(waitlist_position), 0) + 1 INTO _waitlist_pos
        FROM session_rsvps WHERE session_id = _session_id AND status = 'waitlisted';
      _status := 'waitlisted';
    ELSE
      _status := 'confirmed';
      _waitlist_pos := NULL;
    END IF;
  ELSE
    _status := 'confirmed';
    _waitlist_pos := NULL;
  END IF;

  IF _existing IS NOT NULL THEN
    UPDATE session_rsvps SET status = _status, waitlist_position = _waitlist_pos,
      updated_at = now() WHERE id = _existing.id;
  ELSE
    INSERT INTO session_rsvps (session_id, user_id, status, waitlist_position)
      VALUES (_session_id, auth.uid(), _status, _waitlist_pos);
  END IF;

  RETURN _status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel RSVP and promote waitlist
CREATE OR REPLACE FUNCTION public.cancel_session_rsvp(_session_id UUID)
RETURNS VOID AS $$
DECLARE
  _next RECORD;
BEGIN
  UPDATE session_rsvps SET status = 'cancelled', updated_at = now()
    WHERE session_id = _session_id AND user_id = auth.uid();

  -- Promote next waitlisted person
  SELECT * INTO _next FROM session_rsvps
    WHERE session_id = _session_id AND status = 'waitlisted'
    ORDER BY waitlist_position ASC LIMIT 1;

  IF _next IS NOT NULL THEN
    UPDATE session_rsvps SET status = 'confirmed', waitlist_position = NULL, updated_at = now()
      WHERE id = _next.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_session_rsvps_session ON public.session_rsvps(session_id);
CREATE INDEX idx_session_rsvps_user ON public.session_rsvps(user_id);
CREATE INDEX idx_session_rsvps_status ON public.session_rsvps(session_id, status);
```

**Step 2: Apply the migration**

Run: `cd packages/supabase && npx supabase migration up`

**Step 3: Commit**

```
git add packages/supabase/migrations/030_phase1_engagement.sql
git commit -m "feat: add Phase 1 engagement tables (announcements, feedback, polls, RSVP)"
```

---

## Task 2: Announcements — Feature Module

**Files:**
- Create: `apps/web/src/features/announcements/queries.ts`
- Create: `apps/web/src/features/announcements/actions.ts`

**Step 1: Write queries**

```typescript
// queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export type Announcement = {
  id: string;
  event_id: string;
  author_id: string;
  subject: string;
  body: string;
  target_audience: { type: string; ticket_type_ids?: string[] };
  channels: string[];
  status: "draft" | "scheduled" | "sent";
  scheduled_for: string | null;
  sent_at: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
};

export async function getAnnouncements(eventId: string): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Announcement[];
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Announcement;
}

export async function getAnnouncementsForAttendee(eventId: string): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Announcement[];
}

export async function getUnreadCount(eventIds: string[]): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id")
    .in("event_id", eventIds)
    .eq("status", "sent");

  if (!announcements || announcements.length === 0) return 0;

  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id);

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  return announcements.filter((a) => !readIds.has(a.id)).length;
}
```

**Step 2: Write actions**

```typescript
// actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, substituteVariables } from "@/features/emails/lib/send-email";
import { getSegmentedRecipients } from "@/features/emails/lib/segments";

export async function createAnnouncement(
  eventId: string,
  data: {
    subject: string;
    body: string;
    target_audience?: { type: string; ticket_type_ids?: string[] };
    channels?: string[];
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      event_id: eventId,
      author_id: user.id,
      subject: data.subject,
      body: data.body,
      target_audience: data.target_audience ?? { type: "all" },
      channels: data.channels ?? ["in_app"],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/announcements`);
  return announcement;
}

export async function updateAnnouncement(
  eventId: string,
  announcementId: string,
  data: { subject?: string; body?: string; target_audience?: Record<string, unknown>; channels?: string[] }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/announcements`);
}

export async function deleteAnnouncement(eventId: string, announcementId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/announcements`);
}

export async function sendAnnouncement(eventId: string, announcementId: string) {
  const supabase = await createClient();

  const { data: announcement, error: fetchError } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", announcementId)
    .single();

  if (fetchError || !announcement) throw new Error("Announcement not found");

  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  const channels: string[] = announcement.channels ?? ["in_app"];

  // Send email if channel includes email
  if (channels.includes("email")) {
    const audience = announcement.target_audience as { type: string; ticket_type_ids?: string[] };
    const filters = audience.type === "ticket_types"
      ? { ticket_type_ids: audience.ticket_type_ids }
      : undefined;

    const recipients = await getSegmentedRecipients(eventId, filters);

    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50);
      await Promise.allSettled(
        batch.map((recipient) =>
          sendEmail({
            organizationId: event.organization_id,
            eventId,
            to: { email: recipient.email, name: recipient.name },
            subject: substituteVariables(announcement.subject, {
              attendee_name: recipient.name ?? "Attendee",
              event_name: event.title,
            }),
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2>${announcement.subject}</h2>
              <div>${announcement.body}</div>
              <hr/>
              <p style="color:#666;font-size:12px">Sent from ${event.title}</p>
            </div>`,
          })
        )
      );
    }
  }

  // TODO: Send push notifications if channel includes push
  // Uses existing push_tokens table + Expo Push API

  // Mark as sent
  const { error: updateError } = await supabase
    .from("announcements")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/events/${eventId}/announcements`);
}

export async function markAnnouncementRead(announcementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("announcement_reads")
    .upsert({ announcement_id: announcementId, user_id: user.id })
    .select();
}
```

**Step 3: Commit**

```
git add apps/web/src/features/announcements/
git commit -m "feat: add announcements feature module (queries + actions)"
```

---

## Task 3: Announcements — Organizer UI

**Files:**
- Create: `apps/web/src/features/announcements/components/announcement-composer.tsx`
- Create: `apps/web/src/features/announcements/components/announcement-list.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/announcements/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add Announcements tab

**Step 1: Create the composer component**

A form with subject, body (textarea), target audience select, channel checkboxes, and Save Draft / Send Now buttons. Follow the same patterns as `SurveyBuilder` — client component with `useState` and server action calls.

**Step 2: Create the list component**

Table with columns: Subject, Target, Status (Draft/Sent), Sent Date, Read Count, Actions (Edit/Delete/Send). Follow the same table pattern as the announcements sent table in Whova.

**Step 3: Create the page**

Server component that fetches announcements via `getAnnouncements(eventId)` and renders the composer + list. Same layout pattern as `survey/page.tsx`.

**Step 4: Add tab to event layout**

Add to the `tabs` array in `layout.tsx`:
```typescript
{ href: `/events/${eventId}/announcements`, label: "Announcements", icon: Megaphone },
```
Import `Megaphone` from lucide-react.

**Step 5: Commit**

```
git add apps/web/src/features/announcements/components/ apps/web/src/app/\(organizer\)/events/\[eventId\]/announcements/
git commit -m "feat: add announcements organizer UI (composer + list + page)"
```

---

## Task 4: Session Feedback — Feature Module

**Files:**
- Create: `apps/web/src/features/feedback/queries.ts`
- Create: `apps/web/src/features/feedback/actions.ts`

**Step 1: Write queries**

Types: `FeedbackForm`, `FeedbackQuestion` (same shape as `SurveyQuestion` but with `multiple_choice` type added), `SessionFeedbackResponse`.

Functions:
- `getFeedbackForms(eventId)` — list all forms for event
- `getDefaultFeedbackForm(eventId)` — get or create default form
- `getSessionFeedback(sessionId)` — all responses for a session
- `getSessionFeedbackStats(sessionId, questions)` — aggregated stats (reuse pattern from `getSurveyStats`)
- `getEventFeedbackSummary(eventId)` — per-session average ratings

**Step 2: Write actions**

Functions:
- `createFeedbackForm(eventId, data)` — create custom form
- `updateFeedbackForm(formId, data)` — update form questions
- `deleteFeedbackForm(eventId, formId)` — delete non-default form
- `assignFeedbackForm(eventId, sessionId, formId)` — set session's feedback_form_id
- `submitSessionFeedback(sessionId, formId, answers)` — attendee submits feedback

**Step 3: Commit**

```
git add apps/web/src/features/feedback/
git commit -m "feat: add session feedback feature module (queries + actions)"
```

---

## Task 5: Session Feedback — Organizer UI

**Files:**
- Create: `apps/web/src/features/feedback/components/feedback-form-builder.tsx`
- Create: `apps/web/src/features/feedback/components/feedback-results.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/feedback/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add Feedback tab

**Step 1: Create form builder**

Client component. Similar to `SurveyBuilder` — add/remove/reorder questions. Question types: rating (1-5 stars), multiple_choice, text. Each question has label, type, required flag, and options (for multiple_choice).

**Step 2: Create results view**

Server component. Shows per-session feedback summary: session name, average rating, response count. Click a session to see detailed per-question stats (reuse `SurveyResults` pattern).

**Step 3: Create page**

Two-column layout like survey page: form builder on left, results on right.

**Step 4: Add tab**

Add `{ href: \`/events/${eventId}/feedback\`, label: "Feedback", icon: MessageSquare }` to layout tabs. Import `MessageSquare` from lucide-react.

**Step 5: Commit**

```
git commit -m "feat: add session feedback organizer UI (form builder + results)"
```

---

## Task 6: Live Polling — Feature Module

**Files:**
- Create: `apps/web/src/features/polls/queries.ts`
- Create: `apps/web/src/features/polls/actions.ts`

**Step 1: Write queries**

Types: `LivePoll`, `PollOption` (`{id: string, text: string}`), `PollVoteSummary`.

Functions:
- `getPolls(eventId)` — all polls for event with vote counts
- `getPollWithResults(pollId)` — single poll with per-option vote counts
- `getActivePolls(eventId)` — polls with status='open' (for attendee view)
- `getUserVote(pollId, userId)` — get user's current vote

Vote counts computed via aggregation query:
```sql
SELECT option_id, count(*) as count FROM live_poll_votes WHERE poll_id = $1 GROUP BY option_id
```

**Step 2: Write actions**

Functions:
- `createPoll(eventId, data)` — create poll with options
- `updatePoll(pollId, data)` — update question/options (only while draft)
- `deletePoll(eventId, pollId)` — delete poll
- `openPoll(eventId, pollId)` — set status to 'open'
- `closePoll(eventId, pollId)` — set status to 'closed'
- `togglePollResults(eventId, pollId, show)` — toggle show_results
- `votePoll(pollId, optionId)` — upsert vote

**Step 3: Commit**

```
git commit -m "feat: add live polling feature module (queries + actions)"
```

---

## Task 7: Live Polling — Organizer UI

**Files:**
- Create: `apps/web/src/features/polls/components/poll-creator.tsx`
- Create: `apps/web/src/features/polls/components/poll-list.tsx`
- Create: `apps/web/src/features/polls/components/poll-results-chart.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/polls/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add Polls tab

**Step 1: Create poll creator**

Client component. Form: question text input, dynamic option list (add/remove, min 2), session select (optional), Create button.

**Step 2: Create poll list**

Table: Question, Session, Status (Draft/Open/Closed), Created By, Vote Count, Actions (Open/Close/View Results/Delete). Status badges with colors: draft=gray, open=green, closed=red.

**Step 3: Create results chart**

Horizontal bar chart showing option text + vote count + percentage bar. Uses plain divs with width percentages (no chart library needed).

**Step 4: Create page and add tab**

Server component page. Add `{ href: \`/events/${eventId}/polls\`, label: "Polls", icon: BarChart2 }` to layout tabs.

**Step 5: Commit**

```
git commit -m "feat: add live polling organizer UI (creator + list + results)"
```

---

## Task 8: Session RSVP — Feature Module

**Files:**
- Create: `apps/web/src/features/rsvp/queries.ts`
- Create: `apps/web/src/features/rsvp/actions.ts`

**Step 1: Write queries**

Types: `SessionRsvp`, `RsvpSummary` (`{session_id, confirmed_count, waitlisted_count, capacity}`).

Functions:
- `getSessionRsvpSummaries(eventId)` — per-session RSVP counts
- `getSessionRsvpAttendees(sessionId)` — list of RSVPed attendees with status
- `getUserRsvps(eventId, userId)` — all sessions user has RSVPed to
- `getSessionRsvpStatus(sessionId, userId)` — user's RSVP status for a session

**Step 2: Write actions**

Functions:
- `rsvpToSession(sessionId)` — calls the `rsvp_to_session` RPC
- `cancelRsvp(sessionId)` — calls the `cancel_session_rsvp` RPC
- `updateSessionCapacity(eventId, sessionId, capacity, rsvpEnabled)` — organizer updates session capacity

**Step 3: Commit**

```
git commit -m "feat: add session RSVP feature module (queries + actions)"
```

---

## Task 9: Session RSVP — Organizer UI

**Files:**
- Modify: `apps/web/src/features/schedule/components/` — add capacity + RSVP toggle to session editor
- Create: `apps/web/src/features/rsvp/components/rsvp-dashboard.tsx`

**Step 1: Add capacity/RSVP fields to session editor**

In the existing session create/edit form, add:
- `capacity` number input (optional)
- `rsvp_enabled` checkbox toggle

Update `createSession` and `updateSession` actions to include these fields.

**Step 2: Create RSVP dashboard**

Shows a table of all sessions with: Session Name, Time, RSVP Count / Capacity, Waitlist Count. Click a session to see the attendee list. Add to existing schedule page or as sub-view.

**Step 3: Commit**

```
git commit -m "feat: add RSVP capacity fields to schedule + RSVP dashboard"
```

---

## Task 10: Attendee App — Notifications Page

**Files:**
- Create: `apps/attendee/src/app/(app)/notifications/page.tsx`
- Modify: `apps/attendee/src/app/(app)/layout.tsx` — add notification bell to header

**Step 1: Create notifications page**

Lists all announcements for events the user is registered to. Each card shows subject, body preview, sent date. Mark as read on view via `markAnnouncementRead` action. Unread items have a blue dot indicator.

**Step 2: Add notification bell to layout**

Bell icon with unread count badge in the header. Links to `/notifications`.

**Step 3: Commit**

```
git commit -m "feat: add attendee notifications page + bell icon"
```

---

## Task 11: Attendee App — Session Feedback, Polls, RSVP

**Files:**
- Modify: public event schedule/session detail pages to add feedback, poll, and RSVP components

**Step 1: Add RSVP button to session cards**

On session detail, show "RSVP" button if `rsvp_enabled`. Show headcount. If at capacity, show "Join Waitlist". Calls `rsvpToSession` / `cancelRsvp` server actions.

**Step 2: Add feedback button to session detail**

"Give Feedback" button visible after session `end_time`. Opens a modal/inline form with the assigned feedback form's questions. Calls `submitSessionFeedback`.

**Step 3: Add active poll card to session detail**

If there's an open poll for this session, show it inline. Multiple choice options as buttons. Vote submission via `votePoll`. Show results after voting (bar chart).

**Step 4: Commit**

```
git commit -m "feat: add RSVP, feedback, and poll components to attendee session view"
```

---

## Task 12: Update Event Layout Tabs + Final Polish

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Add all new tabs**

Final tabs array should include (in order):
1. Overview
2. Schedule
3. Tickets
4. Form Fields
5. Promo Codes
6. Registrations
7. Check-in
8. Rooms
9. **Announcements** (new)
10. **Feedback** (new)
11. **Polls** (new)
12. Emails
13. Survey
14. Analytics
15. Settings

**Step 2: Verify build**

Run: `cd apps/web && pnpm build`

**Step 3: Commit**

```
git commit -m "feat: finalize Phase 1 engagement — tabs, polish, build verification"
```

---

## Summary

| Task | Feature | Scope |
|------|---------|-------|
| 1 | Migration | Single SQL migration for all 4 features |
| 2 | Announcements | Feature module (queries + actions) |
| 3 | Announcements | Organizer UI (composer + list + page) |
| 4 | Session Feedback | Feature module (queries + actions) |
| 5 | Session Feedback | Organizer UI (form builder + results) |
| 6 | Live Polling | Feature module (queries + actions) |
| 7 | Live Polling | Organizer UI (creator + list + results) |
| 8 | Session RSVP | Feature module (queries + actions) |
| 9 | Session RSVP | Organizer UI (capacity fields + dashboard) |
| 10 | Notifications | Attendee app (notifications page + bell) |
| 11 | Attendee Integration | Session detail (RSVP + feedback + polls) |
| 12 | Final Polish | Tabs, build verify, commit |
