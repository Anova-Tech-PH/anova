# Agenda Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the schedule page into a full Agenda Center with 4 sub-pages (Session Manager, Track Manager, Conflict Check, Session Q&A Manager) matching Whova's layout, with expandable sidebar submenu and correct active-route highlighting.

**Architecture:** Split the monolithic `/schedule` page into sub-routes under `/schedule/`. Add expandable submenu support to `EventSubSidebar`. Move existing `TrackManager` and Q&A components to dedicated pages. Build new Conflict Check feature as a pure-function scanner with UI.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, Tailwind 4, Vitest + RTL

---

### Task 1: Update sidebar to support expandable submenus

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/mobile-event-nav.tsx`

**Step 1: Update the sidebar data model in layout.tsx**

Change the `groups` definition to support items with `children`. Replace the Agenda Center single link with an expandable item containing 4 sub-links:

```tsx
// In layout.tsx, update the groups array Content section:
{
  label: "Content",
  items: [
    { href: `/events/${eventId}`, label: "Basics", icon: "settings" },
    {
      href: `/events/${eventId}/schedule`,
      label: "Agenda Center",
      icon: "calendar",
      children: [
        { href: `/events/${eventId}/schedule`, label: "Session Manager" },
        { href: `/events/${eventId}/schedule/tracks`, label: "Track Manager" },
        { href: `/events/${eventId}/schedule/conflicts`, label: "Conflict Check" },
        { href: `/events/${eventId}/schedule/qa`, label: "Session Q&A Manager" },
      ],
    },
    { href: `/events/${eventId}/rooms`, label: "Rooms", icon: "door-open" },
    { href: `/events/${eventId}/sponsors`, label: "Sponsor Center", icon: "award" },
    { href: `/events/${eventId}/documents`, label: "Documents & Videos", icon: "file-text" },
    { href: `/events/${eventId}/logistics`, label: "Logistics Center", icon: "clipboard-list" },
  ],
},
```

Also update the `TabItem` interface to support optional children:

```tsx
interface TabItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}
```

**Step 2: Update EventSubSidebar to render expandable submenus**

In `event-sub-sidebar.tsx`, update the rendering logic so that items with `children` show a chevron and expand/collapse. An item should auto-expand if the current pathname starts with its `href` prefix.

Key changes:
- Import `ChevronDown` from lucide-react
- Add `TabItem.children` to the interface
- For items with children: render parent as a button (not link) that toggles expansion, show children indented below when expanded
- Active state: parent is highlighted if pathname starts with its href; child is highlighted if pathname matches exactly
- Fix active route matching: use `pathname === item.href` for exact matches on items without children, and `pathname.startsWith(item.href)` for parent items with children

```tsx
// Active state logic fix:
const isActive = item.children
  ? pathname.startsWith(item.href)  // parent: any child route
  : pathname === item.href;         // leaf: exact match only

// For child items:
const isChildActive = pathname === child.href;
```

**Step 3: Update MobileEventNav similarly**

Add the same expandable support to `mobile-event-nav.tsx` — show children inline when the parent group is active.

**Step 4: Fix active route matching globally**

Currently line 88 of `event-sub-sidebar.tsx` uses `const isActive = item.href === pathname;` which is a simple equality check. This breaks when e.g. `/events/[id]/schedule/tracks` doesn't highlight "Agenda Center" parent. The fix (above) uses `startsWith` for parents with children.

For leaf items (no children), also fix: currently "Basics" (`/events/${eventId}`) matches every sub-route because all routes start with that prefix. Use exact match for leaf items.

**Step 5: Commit**

```bash
git add "apps/web/src/app/(organizer)/events/[eventId]/layout.tsx" \
       "apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx" \
       "apps/web/src/app/(organizer)/events/[eventId]/mobile-event-nav.tsx"
git commit -m "feat: add expandable Agenda Center submenu to sidebar"
```

---

### Task 2: Create Session Manager page (refactor existing schedule page)

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/schedule/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/schedule/schedule-editor.tsx`

**Step 1: Simplify schedule-editor.tsx**

Remove `TrackManager` and `SpeakerList` from `ScheduleEditor` — they get their own pages. Keep only `SessionTimeline` and `AgendaImportExport`. The component still needs `tracks` for display (track colors on sessions) but no longer manages them.

```tsx
// schedule-editor.tsx — simplified
"use client";

import { useState } from "react";
import { SessionTimeline } from "@/features/schedule/components/session-timeline";
import { AgendaImportExport } from "@/features/schedule/components/agenda-import-export";

type Track = { id: string; name: string; color: string | null; sort_order: number };
type Speaker = {
  id: string; name: string; title: string | null; company: string | null;
  bio: string | null; photo: string | null; email: string | null;
  linkedin_url: string | null; twitter_handle: string | null;
  website_url: string | null; is_featured: boolean;
};

export function ScheduleEditor({
  eventId, initialTracks, initialSessions, initialSpeakers,
}: {
  eventId: string; initialTracks: Track[]; initialSessions: any[];
  initialSpeakers: Speaker[];
}) {
  const [tracks] = useState(initialTracks);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AgendaImportExport eventId={eventId} sessions={initialSessions} />
      </div>
      <SessionTimeline
        eventId={eventId}
        initialSessions={initialSessions}
        tracks={tracks}
        speakers={initialSpeakers}
      />
    </div>
  );
}
```

**Step 2: Update page.tsx header**

Change title from "Schedule" to "Session Manager" and update description:

```tsx
<h1 className="text-2xl font-semibold">Session Manager</h1>
<p className="text-sm text-muted-foreground">
  Create and manage sessions for your event agenda.
</p>
```

**Step 3: Commit**

```bash
git add "apps/web/src/app/(organizer)/events/[eventId]/schedule/page.tsx" \
       "apps/web/src/app/(organizer)/events/[eventId]/schedule/schedule-editor.tsx"
git commit -m "refactor: simplify Session Manager page, remove embedded tracks/speakers"
```

---

### Task 3: Create standalone Track Manager page

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/schedule/tracks/page.tsx`

**Step 1: Write the Track Manager page**

This is a server component that fetches tracks and renders the existing `TrackManager` component on its own page. Since `TrackManager` currently accepts `onTracksChange`, we need a wrapper that doesn't need that callback (standalone mode).

```tsx
// schedule/tracks/page.tsx
import { getTracksByEvent } from "@/features/schedule/queries";
import { TrackManager } from "@/features/schedule/components/track-manager";

export default async function TrackManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const tracks = await getTracksByEvent(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Track Manager</h1>
        <p className="text-sm text-muted-foreground">
          Organize sessions into parallel tracks with color coding.
        </p>
      </div>
      <TrackManager
        eventId={eventId}
        initialTracks={tracks}
        onTracksChange={() => {}}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "apps/web/src/app/(organizer)/events/[eventId]/schedule/tracks/page.tsx"
git commit -m "feat: add standalone Track Manager page under Agenda Center"
```

---

### Task 4: Build Conflict Check feature

**Files:**
- Create: `apps/web/src/features/schedule/conflict-check.ts` (pure function)
- Create: `apps/web/src/features/schedule/conflict-check.test.ts` (tests)
- Create: `apps/web/src/features/schedule/components/conflict-check-results.tsx` (UI)
- Create: `apps/web/src/app/(organizer)/events/[eventId]/schedule/conflicts/page.tsx`

**Step 1: Write failing tests for conflict detection**

```ts
// conflict-check.test.ts
import { describe, it, expect } from "vitest";
import { detectConflicts, type SessionForConflict, type Conflict } from "./conflict-check";

const makeSession = (overrides: Partial<SessionForConflict>): SessionForConflict => ({
  id: "s1",
  title: "Session 1",
  start_time: "2026-09-11T09:00:00Z",
  end_time: "2026-09-11T10:00:00Z",
  location: null,
  track_id: null,
  speaker_ids: [],
  ...overrides,
});

describe("detectConflicts", () => {
  it("returns empty array when no conflicts", () => {
    const sessions = [
      makeSession({ id: "s1", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", start_time: "2026-09-11T10:00:00Z", end_time: "2026-09-11T11:00:00Z" }),
    ];
    expect(detectConflicts(sessions)).toEqual([]);
  });

  it("detects room conflicts (same location, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", location: "Room A", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: "Room A", start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("room");
    expect(conflicts[0].sessionIds).toEqual(["s1", "s2"]);
  });

  it("detects speaker conflicts (same speaker, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", speaker_ids: ["sp1"], start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", speaker_ids: ["sp1"], start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("speaker");
  });

  it("detects track conflicts (same track, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", track_id: "t1", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", track_id: "t1", start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("track");
  });

  it("ignores null locations (no room conflict if location is null)", () => {
    const sessions = [
      makeSession({ id: "s1", location: null, start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: null, start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z" }),
    ];
    expect(detectConflicts(sessions)).toEqual([]);
  });

  it("does not flag adjacent sessions (end time = start time)", () => {
    const sessions = [
      makeSession({ id: "s1", location: "Room A", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: "Room A", start_time: "2026-09-11T10:00:00Z", end_time: "2026-09-11T11:00:00Z" }),
    ];
    expect(detectConflicts(sessions)).toEqual([]);
  });

  it("deduplicates conflicts (room + speaker on same pair = 2 separate conflicts)", () => {
    const sessions = [
      makeSession({ id: "s1", location: "Room A", speaker_ids: ["sp1"], start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: "Room A", speaker_ids: ["sp1"], start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(2);
    const types = conflicts.map(c => c.type).sort();
    expect(types).toEqual(["room", "speaker"]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/features/schedule/conflict-check.test.ts`
Expected: FAIL — module not found

**Step 3: Implement conflict detection**

```ts
// conflict-check.ts
export type SessionForConflict = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  track_id: string | null;
  speaker_ids: string[];
};

export type Conflict = {
  type: "room" | "speaker" | "track";
  sessionIds: [string, string];
  sessionTitles: [string, string];
  detail: string;
};

function overlaps(a: SessionForConflict, b: SessionForConflict): boolean {
  const aStart = new Date(a.start_time).getTime();
  const aEnd = new Date(a.end_time).getTime();
  const bStart = new Date(b.start_time).getTime();
  const bEnd = new Date(b.end_time).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function detectConflicts(sessions: SessionForConflict[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const a = sessions[i];
      const b = sessions[j];

      if (!overlaps(a, b)) continue;

      // Room conflict
      if (a.location && b.location && a.location === b.location) {
        conflicts.push({
          type: "room",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `Both scheduled in "${a.location}"`,
        });
      }

      // Speaker conflict
      const sharedSpeakers = a.speaker_ids.filter((id) => b.speaker_ids.includes(id));
      if (sharedSpeakers.length > 0) {
        conflicts.push({
          type: "speaker",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `${sharedSpeakers.length} shared speaker(s)`,
        });
      }

      // Track conflict
      if (a.track_id && b.track_id && a.track_id === b.track_id) {
        conflicts.push({
          type: "track",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `Both on the same track`,
        });
      }
    }
  }

  return conflicts;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/features/schedule/conflict-check.test.ts`
Expected: ALL PASS

**Step 5: Build the Conflict Check results UI**

```tsx
// conflict-check-results.tsx
"use client";

import { AlertTriangle, CheckCircle, MapPin, Users, Layers } from "lucide-react";
import { Card, Badge } from "@attendly/ui/components";
import type { Conflict } from "../conflict-check";

const conflictConfig = {
  room: { icon: MapPin, label: "Room Conflict", variant: "destructive" as const, color: "text-red-500" },
  speaker: { icon: Users, label: "Speaker Conflict", variant: "warning" as const, color: "text-amber-500" },
  track: { icon: Layers, label: "Track Conflict", variant: "info" as const, color: "text-blue-500" },
};

export function ConflictCheckResults({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
        <div>
          <h3 className="font-semibold">No Conflicts Found</h3>
          <p className="text-sm text-muted-foreground">
            All sessions are clear of scheduling conflicts.
          </p>
        </div>
      </Card>
    );
  }

  const roomConflicts = conflicts.filter((c) => c.type === "room");
  const speakerConflicts = conflicts.filter((c) => c.type === "speaker");
  const trackConflicts = conflicts.filter((c) => c.type === "track");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <p className="text-sm font-medium">
          {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} detected
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{roomConflicts.length}</p>
          <p className="text-xs text-muted-foreground">Room conflicts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{speakerConflicts.length}</p>
          <p className="text-xs text-muted-foreground">Speaker conflicts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{trackConflicts.length}</p>
          <p className="text-xs text-muted-foreground">Track conflicts</p>
        </Card>
      </div>

      <div className="space-y-3">
        {conflicts.map((conflict, i) => {
          const config = conflictConfig[conflict.type];
          const Icon = config.icon;
          return (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant} className="text-[10px]">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{conflict.detail}</span>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5 text-sm">
                    <span className="font-medium">{conflict.sessionTitles[0]}</span>
                    <span className="text-xs text-muted-foreground">conflicts with</span>
                    <span className="font-medium">{conflict.sessionTitles[1]}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 6: Create the Conflict Check page**

```tsx
// schedule/conflicts/page.tsx
import { getSessionsByEvent } from "@/features/schedule/queries";
import { detectConflicts, type SessionForConflict } from "@/features/schedule/conflict-check";
import { ConflictCheckResults } from "@/features/schedule/components/conflict-check-results";

export default async function ConflictCheckPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const sessions = await getSessionsByEvent(eventId);

  const sessionsForCheck: SessionForConflict[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location,
    track_id: s.track?.id ?? null,
    speaker_ids: s.session_speakers.map((ss: any) => ss.speaker_id),
  }));

  const conflicts = detectConflicts(sessionsForCheck);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conflict Check</h1>
        <p className="text-sm text-muted-foreground">
          Scan your agenda for scheduling conflicts across rooms, speakers, and tracks.
        </p>
      </div>
      <ConflictCheckResults conflicts={conflicts} />
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add "apps/web/src/features/schedule/conflict-check.ts" \
       "apps/web/src/features/schedule/conflict-check.test.ts" \
       "apps/web/src/features/schedule/components/conflict-check-results.tsx" \
       "apps/web/src/app/(organizer)/events/[eventId]/schedule/conflicts/page.tsx"
git commit -m "feat: add Conflict Check page with room/speaker/track detection"
```

---

### Task 5: Create Session Q&A Manager page

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/schedule/qa/page.tsx`
- Modify: `apps/web/src/features/qa/queries.ts` (add `getQABySession` query if needed)

**Step 1: Check existing Q&A queries**

Read `apps/web/src/features/qa/queries.ts` for existing functions. We need a query that groups Q&A by session.

**Step 2: Create the Session Q&A Manager page**

This page shows Q&A stats and moderation grouped by session. It reuses the existing `QAStatsCards` and `ModerationQueue` components but with session-grouped layout.

```tsx
// schedule/qa/page.tsx
import { getModerationQueue, getQAStats } from "@/features/qa/queries";
import { getSessionsByEvent } from "@/features/schedule/queries";
import { QAStatsCards } from "@/features/qa/components/qa-stats";
import { ModerationQueue } from "@/features/qa/components/moderation-queue";

export default async function SessionQAManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [sessions, queue, stats] = await Promise.all([
    getSessionsByEvent(eventId),
    getModerationQueue(eventId),
    getQAStats(eventId),
  ]);

  // Group questions by session
  const questionsBySession = new Map<string, typeof queue>();
  for (const q of queue) {
    const sid = (q as any).session_id;
    if (!questionsBySession.has(sid)) questionsBySession.set(sid, []);
    questionsBySession.get(sid)!.push(q);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Session Q&A Manager</h1>
        <p className="text-sm text-muted-foreground">
          Review and moderate questions submitted by attendees across all sessions.
        </p>
      </div>

      <QAStatsCards stats={stats} />

      <div>
        <h3 className="mb-4 text-base font-semibold">Moderation Queue</h3>
        <ModerationQueue questions={queue} eventId={eventId} />
      </div>
    </div>
  );
}
```

Note: This initially reuses the same components as the existing `/qa` page. The `/qa` page under Engagement can remain as-is or be updated later to link here.

**Step 3: Commit**

```bash
git add "apps/web/src/app/(organizer)/events/[eventId]/schedule/qa/page.tsx"
git commit -m "feat: add Session Q&A Manager page under Agenda Center"
```

---

### Task 6: Update revalidation paths in actions.ts

**Files:**
- Modify: `apps/web/src/features/schedule/actions.ts`

**Step 1: Update revalidatePath calls**

Since tracks/sessions/conflicts are now on separate sub-routes, update `revalidatePath` to revalidate the parent layout so all sub-pages stay fresh:

Replace all occurrences of:
```ts
revalidatePath(`/events/${eventId}/schedule`);
```

With:
```ts
revalidatePath(`/events/${eventId}/schedule`, "layout");
```

This ensures changes to tracks revalidate the Session Manager, and session changes revalidate the Conflict Check page.

**Step 2: Commit**

```bash
git add "apps/web/src/features/schedule/actions.ts"
git commit -m "fix: revalidate schedule layout for all agenda sub-pages"
```

---

### Task 7: Verify and fix active route highlighting

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx` (if not already done in Task 1)

**Step 1: Test active route behavior**

Navigate to each Agenda Center sub-page and verify:
- `/schedule` → "Agenda Center" parent highlighted + "Session Manager" child highlighted
- `/schedule/tracks` → "Agenda Center" parent highlighted + "Track Manager" child highlighted
- `/schedule/conflicts` → "Agenda Center" parent highlighted + "Conflict Check" child highlighted
- `/schedule/qa` → "Agenda Center" parent highlighted + "Session Q&A Manager" child highlighted

Also verify:
- "Basics" (`/events/[id]`) only highlights on exact match, NOT on `/events/[id]/schedule`
- Other sidebar items still work correctly

**Step 2: Fix any issues found**

If "Basics" is incorrectly highlighted on sub-pages, ensure the active check for leaf items without children uses exact match:

```tsx
const isActive = item.href === pathname;
```

But for "Basics" specifically (which is the root `/events/[id]`), it needs special handling since it's also the exact path. Make sure only items WITHOUT children use exact match, and the "Basics" item only highlights when pathname is exactly `/events/${eventId}`.

**Step 3: Commit**

```bash
git add "apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx"
git commit -m "fix: correct active route highlighting for all sidebar items"
```

---

### Task 8: Final integration test

**Step 1: Run all existing tests**

Run: `cd apps/web && npx vitest run`
Expected: ALL PASS (including existing schedule tests + new conflict-check tests)

**Step 2: Manual smoke test**

Navigate through all 4 Agenda Center pages via the sidebar and verify:
1. Session Manager shows sessions with import/export
2. Track Manager shows track CRUD
3. Conflict Check shows conflict scan results
4. Session Q&A Manager shows Q&A moderation
5. Sidebar highlights correctly on each page

**Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat: complete Agenda Center with 4 sub-pages matching Whova"
git push origin main
```
