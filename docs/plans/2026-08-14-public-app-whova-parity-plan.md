# Public Event App — Whova Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Attendly public event pages into an interactive attendee portal matching Whova's attendee web app — with attendee directory, messaging, community board, photos, session Q&A, activity feed, and personal tools.

**Architecture:** All features built into `apps/web` public event routes. Auto-create Supabase Auth accounts on registration. New tables for profiles, messaging, community, photos, Q&A, notes. Supabase Realtime for messaging. Supabase Storage for photo uploads. Dynamic sidebar with notification badges.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (Auth, RLS, Realtime, Storage), Tailwind 4, Vitest

---

## Phase 1: Foundation (Tasks 1-4)

### Task 1: Database Migration — Core Tables

Create migration 072 with all new tables needed for the public app features.

**Files:**
- Create: `packages/supabase/migrations/072_public_app_foundation.sql`

**Step 1: Write the migration**

```sql
-- =====================
-- Migration 072: Public App Foundation
-- Tables: attendee_profiles, direct_messages, community_topics,
--         community_posts, community_topic_follows, event_icebreakers,
--         icebreaker_responses, event_photos, photo_likes,
--         session_questions, question_upvotes, session_notes,
--         attendee_bookmarks, activity_feed
-- =====================

-- 1. attendee_profiles
CREATE TABLE public.attendee_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  title TEXT,
  company TEXT,
  location TEXT,
  bio TEXT,
  is_visible_in_directory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_profiles TO authenticated;
GRANT SELECT ON public.attendee_profiles TO anon;

CREATE INDEX idx_attendee_profiles_event ON public.attendee_profiles(event_id);
CREATE UNIQUE INDEX idx_attendee_profiles_user_event ON public.attendee_profiles(id, event_id);

CREATE POLICY "Users can manage their own profile"
  ON public.attendee_profiles FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view profiles for published events"
  ON public.attendee_profiles FOR SELECT TO authenticated
  USING (
    is_visible_in_directory = true
    AND EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

-- 2. direct_messages
CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;

CREATE INDEX idx_dm_event ON public.direct_messages(event_id);
CREATE INDEX idx_dm_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_dm_conversation ON public.direct_messages(event_id, sender_id, recipient_id);

CREATE POLICY "Users can view their own messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- 3. community_topics
CREATE TABLE public.community_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'discussion' CHECK (type IN ('discussion', 'announcement', 'meetup', 'ask_organizer')),
  description TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  meetup_date TIMESTAMPTZ,
  meetup_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_topics TO authenticated;

CREATE INDEX idx_community_topics_event ON public.community_topics(event_id, created_at DESC);

CREATE POLICY "Authenticated users can view topics for published events"
  ON public.community_topics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'));

CREATE POLICY "Authenticated users can create topics"
  ON public.community_topics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their topics"
  ON public.community_topics FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their topics"
  ON public.community_topics FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Org members can manage all topics"
  ON public.community_topics FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.organization_id)
  ));

-- 4. community_posts (replies)
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.community_posts TO authenticated;

CREATE INDEX idx_community_posts_topic ON public.community_posts(topic_id, created_at);

CREATE POLICY "Authenticated users can view posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_topics ct
    JOIN events e ON e.id = ct.event_id
    WHERE ct.id = topic_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- 5. community_topic_follows
CREATE TABLE public.community_topic_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.community_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, topic_id)
);

ALTER TABLE public.community_topic_follows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.community_topic_follows TO authenticated;

CREATE POLICY "Users can manage their own follows"
  ON public.community_topic_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. event_icebreakers
CREATE TABLE public.event_icebreakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(event_id)
);

ALTER TABLE public.event_icebreakers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.event_icebreakers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_icebreakers TO authenticated;

CREATE POLICY "Anyone can view icebreakers for published events"
  ON public.event_icebreakers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'));

CREATE POLICY "Org members can manage icebreakers"
  ON public.event_icebreakers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.organization_id)
  ));

-- 7. icebreaker_responses
CREATE TABLE public.icebreaker_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  introduction TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.icebreaker_responses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.icebreaker_responses TO authenticated;

CREATE POLICY "Authenticated users can view responses"
  ON public.icebreaker_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'));

CREATE POLICY "Users can create their own response"
  ON public.icebreaker_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. event_photos
CREATE TABLE public.event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  caption TEXT,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.event_photos TO authenticated;

CREATE INDEX idx_event_photos_event ON public.event_photos(event_id, created_at DESC);

CREATE POLICY "Authenticated users can view photos for published events"
  ON public.event_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'));

CREATE POLICY "Authenticated users can upload photos"
  ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.event_photos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 9. photo_likes
CREATE TABLE public.photo_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, photo_id)
);

ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.photo_likes TO authenticated;

CREATE POLICY "Users can manage their own likes"
  ON public.photo_likes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION update_photo_likes_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_photos SET likes_count = likes_count + 1 WHERE id = NEW.photo_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_photos SET likes_count = likes_count - 1 WHERE id = OLD.photo_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_photo_likes_count
  AFTER INSERT OR DELETE ON public.photo_likes
  FOR EACH ROW EXECUTE FUNCTION update_photo_likes_count();

-- 10. session_notes (private)
CREATE TABLE public.session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes TO authenticated;

CREATE POLICY "Users can manage their own notes"
  ON public.session_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 11. attendee_bookmarks (bookmarking other attendees)
CREATE TABLE public.attendee_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookmarked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, bookmarked_user_id, event_id)
);

ALTER TABLE public.attendee_bookmarks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.attendee_bookmarks TO authenticated;

CREATE POLICY "Users can manage their own attendee bookmarks"
  ON public.attendee_bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 12. activity_feed
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'photo', 'community_post', 'meetup')),
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.activity_feed TO authenticated;

CREATE INDEX idx_activity_feed_event ON public.activity_feed(event_id, created_at DESC);

CREATE POLICY "Authenticated users can view feed for published events"
  ON public.activity_feed FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published'));

CREATE POLICY "Authenticated users can create feed items"
  ON public.activity_feed FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 13. Storage bucket for attendee photos
INSERT INTO storage.buckets (id, name, public) VALUES ('attendee-photos', 'attendee-photos', true);

CREATE POLICY "Authenticated users can upload attendee photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attendee-photos');

CREATE POLICY "Anyone can view attendee photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'attendee-photos');

CREATE POLICY "Users can delete their own attendee photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attendee-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
```

**Step 2: Apply the migration**

Run: `npx supabase migration up`
Expected: All tables created successfully.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/072_public_app_foundation.sql
git commit -m "feat(db): add public app foundation tables (migration 072)"
```

---

### Task 2: Auto-Account Creation on Registration

Modify the registration action to auto-create Supabase Auth accounts and attendee profiles.

**Files:**
- Modify: `apps/web/src/features/registration/actions.ts`
- Test: `apps/web/src/features/registration/actions.test.ts`

**Step 1: Write the failing test**

Add tests to the existing test file for auto-account creation behavior.

```typescript
describe("registerForEvent - auto account creation", () => {
  it("creates auth user and attendee profile on registration", async () => {
    // Mock setup: valid ticket, no existing registration
    // Assert: supabase.auth.admin.createUser called with email
    // Assert: attendee_profiles insert called with display_name from registration name
  });

  it("links existing user if email already has account", async () => {
    // Mock setup: auth.admin.createUser returns error (user exists)
    // Mock: auth.admin.listUsers returns existing user
    // Assert: registration created with existing user_id
  });

  it("still completes registration if account creation fails", async () => {
    // Mock: auth.admin.createUser throws
    // Assert: registration still created (user_id = null)
    // Assert: no error thrown to caller
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/features/registration/actions.test.ts`

**Step 3: Implement auto-account creation**

In `registerForEvent`, after the successful registration insert, add:

```typescript
// Auto-create auth account (best-effort, don't block registration)
try {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Try to create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email.trim().toLowerCase(),
    email_confirm: true,
    user_metadata: { display_name: data.name },
  });

  let userId: string | null = null;

  if (authData?.user) {
    userId = authData.user.id;
  } else if (authError?.message?.includes("already been registered")) {
    // User exists — look up their ID
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existingUser = listData?.users?.find(
      (u) => u.email === data.email.trim().toLowerCase()
    );
    if (existingUser) userId = existingUser.id;
  }

  if (userId) {
    // Link registration to user
    await adminClient
      .from("registrations")
      .update({ user_id: userId })
      .eq("id", registrationId);

    // Create attendee profile (upsert to handle existing)
    await adminClient
      .from("attendee_profiles")
      .upsert({
        id: userId,
        event_id: eventId,
        display_name: data.name,
        company: data.company || null,
        title: data.title || null,
      }, { onConflict: "id,event_id" });

    // Send password reset email so they can set a password
    await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: data.email.trim().toLowerCase(),
    });
  }
} catch {
  // Silently fail — registration is the priority
  console.error("Auto-account creation failed (non-blocking)");
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/features/registration/actions.test.ts`

**Step 5: Commit**

```bash
git add apps/web/src/features/registration/actions.ts apps/web/src/features/registration/actions.test.ts
git commit -m "feat: auto-create auth account and attendee profile on registration"
```

---

### Task 3: Sticky Event Header Bar

Add a persistent event context bar above the main content area.

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-header-bar.tsx`
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/layout.tsx`

**Step 1: Create the event header bar component**

```typescript
// event-header-bar.tsx
"use client";

import { use, useState, useEffect } from "react";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";

export function EventHeaderBar({
  event,
}: {
  event: {
    title: string;
    start_date: string;
    end_date: string;
    venue_name: string | null;
    timezone: string | null;
    is_virtual: boolean;
  };
}) {
  const [useLocalTime, setUseLocalTime] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("attendly-timezone-pref");
    if (saved === "event") setUseLocalTime(false);
  }, []);

  function toggleTimezone() {
    const next = !useLocalTime;
    setUseLocalTime(next);
    localStorage.setItem("attendly-timezone-pref", next ? "local" : "event");
  }

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateStr =
    startDate.toDateString() === endDate.toDateString()
      ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const mapUrl = event.venue_name
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name)}`
    : null;

  return (
    <div className="sticky top-0 z-30 hidden lg:flex items-center gap-4 border-b bg-primary px-4 py-2 text-primary-foreground text-sm">
      <span className="font-semibold truncate max-w-[300px]">{event.title}</span>
      <span className="text-primary-foreground/70">|</span>

      {event.venue_name && (
        <>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              {event.venue_name}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.venue_name}
            </span>
          )}
          <span className="text-primary-foreground/70">|</span>
        </>
      )}

      <span>{dateStr}</span>

      {event.timezone && (
        <>
          <span className="text-primary-foreground/70">|</span>
          <button
            onClick={toggleTimezone}
            className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-primary-foreground/10 transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            {useLocalTime ? "Switch to event time" : "Switch to local time"}
          </button>
        </>
      )}
    </div>
  );
}
```

**Step 2: Modify layout.tsx to include the header bar**

```typescript
import { EventSidebar } from "./event-sidebar";
import { EventHeaderBar } from "./event-header-bar";
import { createClient } from "@attendly/ui/supabase/server";

export default async function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, end_date, venue_name, timezone, is_virtual")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  return (
    <div className="min-h-screen lg:flex">
      <EventSidebar params={params} />
      <div className="flex-1 min-w-0 flex flex-col">
        {event && <EventHeaderBar event={event} />}
        <main className="flex-1 min-w-0 pt-[57px] lg:pt-0">{children}</main>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/event-header-bar.tsx apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/layout.tsx
git commit -m "feat: add sticky event header bar with timezone toggle"
```

---

### Task 4: Dynamic Sidebar with Badges and Collapsible Sections

Refactor the sidebar to hide empty sections, add notification badges, and group items under collapsible Agenda/My Stuff sections.

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-sidebar.tsx`

**Step 1: Rewrite sidebar with dynamic sections**

The sidebar should:
- Accept server-fetched counts as props (resource count, room count, logistics exists, certificate enabled, community post count, unread message count)
- Hide items when count is 0 (Resources, Rooms, Logistics, Certificate)
- Show red badges on Community, Attendees
- Group "Agenda > Sessions + Speakers" and "My Stuff > My Agenda, My Notes, Messages, Profile" as collapsible
- Show/hide My Stuff based on auth state

Pass counts from a new server component wrapper or from layout.tsx data fetch.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/event-sidebar.tsx apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/layout.tsx
git commit -m "feat: dynamic sidebar with badges, collapsible sections, hidden empty items"
```

---

## Phase 2: Attendee Directory & Messaging (Tasks 5-8)

### Task 5: Attendee Profile Feature — Actions & Queries

**Files:**
- Create: `apps/web/src/features/attendee-profile/actions.ts`
- Create: `apps/web/src/features/attendee-profile/queries.ts`
- Create: `apps/web/src/features/attendee-profile/actions.test.ts`
- Create: `apps/web/src/features/attendee-profile/queries.test.ts`

**Actions:**
- `updateProfile(eventId, data)` — upsert attendee_profiles
- `toggleAttendeeBookmark(eventId, targetUserId)` — toggle attendee_bookmarks
- `uploadAvatar(eventId, file)` — upload to Supabase Storage attendee-photos bucket

**Queries:**
- `getAttendeeDirectory(eventId, { tab, search, category, page })` — paginated attendee list with tabs (all/recommended/bookmarked/categories)
- `getAttendeeProfile(eventId, userId)` — single profile with interests
- `getMyProfile(eventId)` — current user's profile
- `getBookmarkedAttendees(eventId)` — list of bookmarked attendee IDs

TDD: Write tests first, then implement.

---

### Task 6: Attendee Directory Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/attendees/page.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/attendees/[userId]/page.tsx`
- Create: `apps/web/src/features/attendee-profile/components/attendee-directory.tsx`
- Create: `apps/web/src/features/attendee-profile/components/attendee-card.tsx`
- Create: `apps/web/src/features/attendee-profile/components/attendee-profile-view.tsx`

**Directory page features:**
- Tabs: All, Recommended, Bookmarked, Categories
- Search bar: name, company, title, location
- Alphabetical grouping (A, B, C...)
- Attendee count display ("749 attendees total")
- Card with: avatar, name, title/company, actions (Bookmark, View Profile, Say Hi)

**Profile detail page features:**
- Full profile: avatar, name, title, company, location, bio
- Interests from event_interests/attendee_interests
- Actions: Send Message, Bookmark
- Back to directory link

---

### Task 7: Messaging Feature — Actions, Queries & Components

**Files:**
- Create: `apps/web/src/features/messaging/actions.ts`
- Create: `apps/web/src/features/messaging/queries.ts`
- Create: `apps/web/src/features/messaging/actions.test.ts`
- Create: `apps/web/src/features/messaging/components/say-hi-dialog.tsx`
- Create: `apps/web/src/features/messaging/components/message-inbox.tsx`
- Create: `apps/web/src/features/messaging/components/conversation-thread.tsx`

**Actions:**
- `sendMessage(eventId, recipientId, content)` — insert direct_message + activity_feed entry
- `markMessagesRead(eventId, senderId)` — bulk update read_at for conversation

**Queries:**
- `getConversations(eventId)` — grouped by other person, latest message, unread count
- `getConversationMessages(eventId, otherUserId)` — full thread
- `getUnreadMessageCount(eventId)` — total unread for badge

**Components:**
- `SayHiDialog` — modal opened from attendee card/profile, text input + send
- `MessageInbox` — list of conversations (under My Stuff > Messages)
- `ConversationThread` — full message thread with real-time via Supabase Realtime

---

### Task 8: Messages Page (My Stuff)

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/messages/page.tsx`

Page that shows the MessageInbox component. Requires auth — redirect to login if not authenticated.

---

## Phase 3: Community Board (Tasks 9-11)

### Task 9: Community Feature — Actions & Queries

**Files:**
- Create: `apps/web/src/features/community/actions.ts`
- Create: `apps/web/src/features/community/queries.ts`
- Create: `apps/web/src/features/community/actions.test.ts`

**Actions:**
- `createTopic(eventId, { title, type, description, meetup_date?, meetup_location? })`
- `deleteTopic(eventId, topicId)`
- `createPost(topicId, content)` — reply + activity_feed entry
- `deletePost(postId)`
- `toggleFollow(topicId)` — toggle community_topic_follows
- `submitIcebreaker(eventId, { introduction, answer })` — upsert icebreaker_responses

**Queries:**
- `getTopics(eventId, { tab, search })` — with tabs: all/following/by_organizers/new. Include post_count, follower_count, latest_post_at, is_following
- `getTopicDetail(topicId)` — topic + all posts with author profiles
- `getIcebreaker(eventId)` — icebreaker config + whether user has responded
- `getNewTopicCount(eventId)` — for sidebar badge

---

### Task 10: Community Board Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/community/page.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/community/[topicId]/page.tsx`
- Create: `apps/web/src/features/community/components/community-board.tsx`
- Create: `apps/web/src/features/community/components/topic-card.tsx`
- Create: `apps/web/src/features/community/components/topic-detail.tsx`
- Create: `apps/web/src/features/community/components/create-topic-dialog.tsx`
- Create: `apps/web/src/features/community/components/icebreaker-dialog.tsx`

**Board features:**
- Tabs: All Topics, Following, By Organizers, New
- Search bar
- Topic cards: title, type icon, description preview, post count, follower count, "Follow"/"View" buttons, new post badges
- "+ Add new topic" button at bottom
- Icebreaker popup on first visit (if configured and user hasn't responded)

**Topic detail features:**
- Topic header with title, type, author, date
- Post thread (chronological)
- Reply form at bottom
- Follow/unfollow button

---

### Task 11: Icebreaker Organizer Setup

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/community/page.tsx`
- Create: `apps/web/src/features/community/components/icebreaker-config.tsx`

Add organizer page to configure the icebreaker question and options. Simple form: question text, dropdown options (tag input), enable/disable toggle.

---

## Phase 4: Photos & Session Q&A (Tasks 12-15)

### Task 12: Photo Gallery Feature — Actions & Queries

**Files:**
- Create: `apps/web/src/features/photos/actions.ts`
- Create: `apps/web/src/features/photos/queries.ts`
- Create: `apps/web/src/features/photos/actions.test.ts`

**Actions:**
- `uploadPhoto(eventId, { file, caption, media_type })` — upload to storage + insert event_photos + activity_feed
- `deletePhoto(photoId)`
- `togglePhotoLike(photoId)` — toggle photo_likes

**Queries:**
- `getPhotos(eventId, { tab, page })` — paginated, tabs: all/photos/videos. Include user profile info, is_liked
- `getPhotoCount(eventId)` — total, photo count, video count

---

### Task 13: Photo Gallery Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/photos/page.tsx`
- Create: `apps/web/src/features/photos/components/photo-gallery.tsx`
- Create: `apps/web/src/features/photos/components/photo-card.tsx`
- Create: `apps/web/src/features/photos/components/upload-photo-dialog.tsx`

**Features:**
- Tabs: All Media Types, Photos (count), Videos (count)
- Grid layout with masonry-like cards
- Each card: image, "By {name}", like count + button
- "+ Share a photo" button
- Upload dialog: file picker, caption, submit
- Total count in header ("996 posts")

---

### Task 14: Session Q&A Feature — Actions, Queries & Components

**Files:**
- Create: `apps/web/src/features/session-qa/actions.ts`
- Create: `apps/web/src/features/session-qa/queries.ts`
- Create: `apps/web/src/features/session-qa/actions.test.ts`
- Create: `apps/web/src/features/session-qa/components/qa-session-list.tsx`
- Create: `apps/web/src/features/session-qa/components/qa-question-list.tsx`
- Create: `apps/web/src/features/session-qa/components/ask-question-form.tsx`

**Note:** The existing `features/qa/` handles organizer-side Q&A. This new `features/session-qa/` is for the public attendee view using the same `session_questions` table (which already exists from the qa feature).

**Actions:**
- `askQuestion(sessionId, content)` — insert session_questions
- `toggleUpvote(questionId)` — toggle question_upvotes, update upvotes_count

**Queries:**
- `getSessionsWithQA(eventId, { search, bookmarkedSessionIds })` — sessions with question_count, grouped by "from my agenda" / "other"
- `getSessionQuestions(sessionId)` — questions sorted by upvotes, with author info, is_upvoted

---

### Task 15: Session Q&A Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/qa/page.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/qa/[sessionId]/page.tsx`

**List page:** Search bar, "Sessions from My Agenda" section, "Other sessions" section, each with session title + date + question count + "View questions" button.

**Detail page:** Session title + date, question list sorted by upvotes, upvote button, "Ask a question" form at top.

---

## Phase 5: My Stuff & Schedule Enhancements (Tasks 16-20)

### Task 16: My Agenda Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/my-agenda/page.tsx`
- Create: `apps/web/src/features/my-agenda/queries.ts`

**Features:**
- "My Agenda" heading + "Go to full agenda" button
- Search bar + day tabs (like Whova)
- Shows only bookmarked sessions (from session_bookmarks)
- Same session card layout as schedule page
- Empty state: "No Sessions found" with illustration

---

### Task 17: Session Notes Feature

**Files:**
- Create: `apps/web/src/features/session-notes/actions.ts`
- Create: `apps/web/src/features/session-notes/queries.ts`
- Create: `apps/web/src/features/session-notes/actions.test.ts`
- Create: `apps/web/src/features/session-notes/components/note-button.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/my-notes/page.tsx`

**Actions:**
- `saveNote(sessionId, content)` — upsert session_notes
- `exportNotes(eventId)` — returns all notes as structured data

**Components:**
- `NoteButton` — "Add notes" icon on session cards, opens inline textarea, auto-saves on blur
- My Notes page: list all notes with session title/date, "Export to email" button

---

### Task 18: Schedule Page Enhancements

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/page.tsx`

Add to existing schedule page:
- **Search bar**: filter sessions by title, speaker name, location
- **Day tabs**: horizontal tabs for each day (with arrow navigation for multi-day events)
- **"Add notes" button** on each session card (using NoteButton component)
- **Full Agenda / My Agenda toggle** at top (links to /my-agenda)

---

### Task 19: Attendee Profile Edit Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/profile/page.tsx`
- Create: `apps/web/src/features/attendee-profile/components/profile-editor.tsx`

**Features:**
- Edit: display_name, avatar (upload), title, company, location, bio
- Select interests from event's event_interests (checkbox grid)
- Toggle directory visibility
- Save button with toast feedback

---

### Task 20: Activity Feed (Home Page)

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/page.tsx`
- Create: `apps/web/src/features/activity-feed/queries.ts`
- Create: `apps/web/src/features/activity-feed/components/activity-feed.tsx`
- Create: `apps/web/src/features/activity-feed/components/feed-item.tsx`

**Changes:**
- Keep event hero at top
- Below hero, add two-column layout (desktop): activity feed (left), event stats sidebar (right)
- Feed items: announcement cards, photo shares, community posts, meetup creations
- Each item: author avatar + name, timestamp, content preview, like/view action
- Paginated (load more button)
- For unauthenticated users: show existing static content (about, speakers, schedule preview)

---

## Phase 6: Gamification Placeholder & Final Polish (Tasks 21-24)

### Task 21: Gamification Coming Soon Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/leaderboard/page.tsx`

Simple "Coming Soon" page with:
- Trophy illustration or icon
- "Gamification & Leaderboard" heading
- Description: "Earn points by participating in sessions, polls, community discussions, and more. Compete with other attendees and win prizes!"
- "Coming Soon" badge

---

### Task 22: Update Sidebar Navigation Items

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-sidebar.tsx`

Update the nav items array to match the new structure:
- Add: Attendees, Community, Photos, Session Q&A, Leaderboard
- Move Speakers under Agenda as sub-item
- Add My Stuff section: My Agenda, My Notes, Messages, Profile
- Wire up notification badges from server-fetched counts
- Remove "Website" item (or rename to avoid confusion)

---

### Task 23: Auth Guard Component for Protected Pages

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/auth-guard.tsx`

Reusable component that wraps pages requiring authentication:
- If user is logged in: render children
- If not: show "Sign in to access this feature" card with sign-in button
- Sign-in redirects back to current page after login

Use on: Attendees, Community, Photos, Messages, My Agenda, My Notes, Profile pages.

---

### Task 24: Integration Testing & Final Cleanup

**Files:**
- Various test files across features

**Steps:**
1. Run all existing tests: `cd apps/web && npx vitest run`
2. Fix any broken tests from layout/sidebar changes
3. Verify all new pages render correctly
4. Test auth flow: register → auto-account → set password → access gated features
5. Test sidebar: hidden items, badges, collapsible sections
6. Test timezone toggle persistence
7. Clean up any unused imports from old sidebar

---

## Task Dependency Graph

```
Task 1 (DB migration)
  ├── Task 2 (Auto-account creation)
  ├── Task 3 (Event header bar)
  ├── Task 4 (Dynamic sidebar)
  │     └── Task 22 (Final sidebar nav items)
  ├── Task 5 (Profile actions/queries)
  │     ├── Task 6 (Directory page)
  │     └── Task 19 (Profile edit page)
  ├── Task 7 (Messaging actions/queries)
  │     └── Task 8 (Messages page)
  ├── Task 9 (Community actions/queries)
  │     ├── Task 10 (Community board page)
  │     └── Task 11 (Icebreaker organizer setup)
  ├── Task 12 (Photo actions/queries)
  │     └── Task 13 (Photo gallery page)
  ├── Task 14 (Session Q&A actions/queries)
  │     └── Task 15 (Session Q&A page)
  ├── Task 16 (My Agenda page)
  ├── Task 17 (Session notes feature)
  │     └── Task 18 (Schedule enhancements)
  ├── Task 20 (Activity feed)
  ├── Task 21 (Gamification placeholder)
  └── Task 23 (Auth guard)
        └── Task 24 (Integration testing)
```

Tasks within each phase can be parallelized. Phases must be sequential (each depends on prior phase's DB/foundation work).
