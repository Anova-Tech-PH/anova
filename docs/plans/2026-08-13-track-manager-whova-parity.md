# Track Manager — Whova Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add many-to-many tracks, bulk track assignment, attendee track filtering, and custom hex colors to match Whova's Track Manager.

**Architecture:** New `session_tracks` junction table replaces `sessions.track_id` FK. All queries, actions, forms, and display components updated to handle arrays of tracks. Attendee app gets client-side track filter bar.

**Tech Stack:** Supabase (PostgreSQL migrations, RLS), Next.js server actions, React client components, Vitest for tests.

---

### Task 1: Database Migration — session_tracks Junction Table

**Files:**
- Create: `packages/supabase/migrations/054_session_tracks.sql`

**Step 1: Write the migration**

```sql
-- Many-to-many: sessions <-> tracks
create table public.session_tracks (
  session_id uuid not null references public.sessions(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  primary key (session_id, track_id)
);

alter table public.session_tracks enable row level security;

-- RLS: follow session visibility (same pattern as session_speakers)
create policy "Session tracks follow session visibility"
  on public.session_tracks for select
  using (exists (
    select 1 from public.sessions s
    join public.events e on e.id = s.event_id
    where s.id = session_tracks.session_id
      and (e.status = 'published' or public.is_org_member(e.organization_id))
  ));

create policy "Editors can manage session tracks"
  on public.session_tracks for all
  using (exists (
    select 1 from public.sessions s
    join public.events e on e.id = s.event_id
    where s.id = session_tracks.session_id
      and public.is_org_member(e.organization_id, 'editor')
  ));

-- Grant access
grant select on public.session_tracks to anon, authenticated;
grant all on public.session_tracks to authenticated;

-- Migrate existing data
insert into public.session_tracks (session_id, track_id)
select id, track_id from public.sessions where track_id is not null;

-- Drop old column
alter table public.sessions drop column track_id;

-- Index for reverse lookups (track -> sessions)
create index idx_session_tracks_track on public.session_tracks(track_id);
```

**Step 2: Apply migration**

Run: `npx supabase migration up`
Expected: Migration applied, no errors.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/054_session_tracks.sql
git commit -m "feat: add session_tracks junction table for many-to-many tracks"
```

---

### Task 2: Update Queries — Join Through session_tracks

**Files:**
- Modify: `apps/web/src/features/schedule/queries.ts`

**Step 1: Write failing test**

No separate test file for queries (they hit Supabase). Instead, verify compilation.

**Step 2: Update getSessionsByEvent**

Change `queries.ts:16-31`. Replace the `track:tracks(id, name, color)` join with `session_tracks(track_id, tracks(id, name, color))`:

```typescript
export async function getSessionsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      session_tracks(track_id, tracks(id, name, color)),
      session_speakers(speaker_id, speakers(id, name, title, company, photo))
    `)
    .eq("event_id", eventId)
    .order("start_time");

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 3: Update getScheduleData**

Change `queries.ts:38-46`. Same join change in the sessions query:

```typescript
export async function getScheduleData(eventId: string) {
  const supabase = await createClient();

  const [tracks, sessions, event] = await Promise.all([
    supabase.from("tracks").select("*").eq("event_id", eventId).order("sort_order"),
    supabase
      .from("sessions")
      .select(`
        *,
        session_tracks(track_id, tracks(id, name, color)),
        session_speakers(speaker_id, speakers(id, name, title, company, photo))
      `)
      .eq("event_id", eventId)
      .order("start_time"),
    supabase.from("events").select("start_date, end_date, timezone").eq("id", eventId).single(),
  ]);

  if (tracks.error) throw new Error(tracks.error.message);
  if (sessions.error) throw new Error(sessions.error.message);

  return {
    tracks: tracks.data,
    sessions: sessions.data,
    event: event.data,
  };
}
```

**Step 4: Verify build**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`
Expected: Type errors in consuming components (expected — we'll fix those next).

**Step 5: Commit**

```bash
git add apps/web/src/features/schedule/queries.ts
git commit -m "feat: update schedule queries for session_tracks junction table"
```

---

### Task 3: Update Actions — track_ids Instead of track_id

**Files:**
- Modify: `apps/web/src/features/schedule/actions.ts`
- Modify: `apps/web/src/features/schedule/actions.test.ts`

**Step 1: Write failing tests for new track_ids behavior**

Add to `actions.test.ts`:

```typescript
describe("createSession with track_ids", () => {
  it("links tracks via session_tracks when track_ids provided", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return createQueryMock({ data: { id: "sess-1" }, error: null }); // sessions insert
      return createQueryMock({ data: null, error: null }); // session_tracks / session_speakers
    });

    const { createSession } = await import("./actions");
    await createSession("evt-1", {
      title: "Talk",
      type: "talk",
      start_time: "2026-01-01T10:00:00Z",
      end_time: "2026-01-01T11:00:00Z",
      track_ids: ["t1", "t2"],
    });

    expect(mockFrom).toHaveBeenCalledWith("session_tracks");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/schedule/actions.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `track_ids` not accepted yet.

**Step 3: Update createSession**

In `actions.ts:61-121`, change `track_id?: string` to `track_ids?: string[]`. Remove `track_id` from the session insert. After session insert, insert into `session_tracks`:

```typescript
export async function createSession(eventId: string, data: {
  title: string;
  description?: string;
  type: string;
  start_time: string;
  end_time: string;
  location?: string;
  track_ids?: string[];
  speaker_ids?: string[];
  enable_check_in?: boolean;
  capacity?: number | null;
  rsvp_enabled?: boolean;
  document_ids?: string[];
  poll_ids?: string[];
}) {
  const supabase = await createClient();

  const { track_ids, speaker_ids, capacity, rsvp_enabled, document_ids, poll_ids, ...sessionData } = data;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      event_id: eventId,
      ...sessionData,
      capacity: capacity ?? null,
      rsvp_enabled: rsvp_enabled ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Link tracks
  if (track_ids && track_ids.length > 0) {
    const { error: trackError } = await supabase
      .from("session_tracks")
      .insert(track_ids.map((tid) => ({ session_id: session.id, track_id: tid })));

    if (trackError) throw new Error(trackError.message);
  }

  // Link speakers
  if (speaker_ids && speaker_ids.length > 0) {
    const { error: linkError } = await supabase
      .from("session_speakers")
      .insert(speaker_ids.map((sid) => ({ session_id: session.id, speaker_id: sid })));

    if (linkError) throw new Error(linkError.message);
  }

  // Link documents
  if (document_ids && document_ids.length > 0) {
    await supabase
      .from("event_documents")
      .update({ session_id: session.id })
      .in("id", document_ids);
  }

  // Link polls
  if (poll_ids && poll_ids.length > 0) {
    await supabase
      .from("live_polls")
      .update({ session_id: session.id })
      .in("id", poll_ids);
  }

  revalidatePath(`/events/${eventId}/schedule`, "layout");
  return session;
}
```

**Step 4: Update updateSession**

In `actions.ts:123-205`, change `track_id?: string | null` to `track_ids?: string[]`. Replace track update with delete-then-insert on `session_tracks` (same pattern as `session_speakers`):

```typescript
export async function updateSession(eventId: string, sessionId: string, data: {
  title?: string;
  description?: string;
  type?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  track_ids?: string[];
  speaker_ids?: string[];
  enable_check_in?: boolean;
  capacity?: number | null;
  rsvp_enabled?: boolean;
  document_ids?: string[];
  poll_ids?: string[];
}) {
  const supabase = await createClient();

  const { track_ids, speaker_ids, capacity, rsvp_enabled, document_ids, poll_ids, ...sessionData } = data;

  const { error } = await supabase
    .from("sessions")
    .update({
      ...sessionData,
      updated_at: new Date().toISOString(),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(rsvp_enabled !== undefined ? { rsvp_enabled } : {}),
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);

  // Update track links if provided
  if (track_ids !== undefined) {
    await supabase
      .from("session_tracks")
      .delete()
      .eq("session_id", sessionId);

    if (track_ids.length > 0) {
      const { error: trackError } = await supabase
        .from("session_tracks")
        .insert(track_ids.map((tid) => ({ session_id: sessionId, track_id: tid })));

      if (trackError) throw new Error(trackError.message);
    }
  }

  // Update speaker links if provided (unchanged)
  if (speaker_ids !== undefined) {
    await supabase
      .from("session_speakers")
      .delete()
      .eq("session_id", sessionId);

    if (speaker_ids.length > 0) {
      const { error: linkError } = await supabase
        .from("session_speakers")
        .insert(speaker_ids.map((sid) => ({ session_id: sessionId, speaker_id: sid })));

      if (linkError) throw new Error(linkError.message);
    }
  }

  // Update document links if provided (unchanged)
  if (document_ids !== undefined) {
    await supabase
      .from("event_documents")
      .update({ session_id: null })
      .eq("session_id", sessionId);

    if (document_ids.length > 0) {
      await supabase
        .from("event_documents")
        .update({ session_id: sessionId })
        .in("id", document_ids);
    }
  }

  // Update poll links if provided (unchanged)
  if (poll_ids !== undefined) {
    await supabase
      .from("live_polls")
      .update({ session_id: null })
      .eq("session_id", sessionId);

    if (poll_ids.length > 0) {
      await supabase
        .from("live_polls")
        .update({ session_id: sessionId })
        .in("id", poll_ids);
    }
  }

  revalidatePath(`/events/${eventId}/schedule`, "layout");
}
```

**Step 5: Add bulkAssignTracks action**

Add after `deleteSession`:

```typescript
export async function bulkAssignTracks(
  eventId: string,
  sessionIds: string[],
  trackIds: string[]
) {
  if (sessionIds.length === 0) return;

  const supabase = await createClient();

  // Delete existing track links for these sessions
  for (const sessionId of sessionIds) {
    await supabase
      .from("session_tracks")
      .delete()
      .eq("session_id", sessionId);
  }

  // Insert new track links
  if (trackIds.length > 0) {
    const rows = sessionIds.flatMap((sid) =>
      trackIds.map((tid) => ({ session_id: sid, track_id: tid }))
    );

    const { error } = await supabase
      .from("session_tracks")
      .insert(rows);

    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/schedule`, "layout");
}
```

**Step 6: Update bulkImportSessions**

In `actions.ts:312-348`, change from setting `track_id` on the session insert to inserting into `session_tracks` after session creation. The `trackName` field now supports semicolon-separated values for multiple tracks:

Change `BulkImportSession` interface:

```typescript
export interface BulkImportSession {
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string;
  trackNames: string[];  // Changed from trackName: string
  speakerNames: string[];
}
```

In the session insert loop (lines 313-348), remove `track_id` from the insert and add `session_tracks` rows after:

```typescript
  // 5. Insert sessions and link speakers + tracks
  for (const s of sessions) {
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        event_id: eventId,
        title: s.title,
        description: s.description || null,
        type: s.type,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create session "${s.title}": ${error.message}`);

    // Link tracks
    if (s.trackNames.length > 0) {
      const trackLinks = s.trackNames
        .map((name) => trackMap.get(name.toLowerCase()))
        .filter((id): id is string => !!id)
        .map((trackId) => ({ session_id: session.id, track_id: trackId }));

      if (trackLinks.length > 0) {
        const { error: trackError } = await supabase
          .from("session_tracks")
          .insert(trackLinks);

        if (trackError) throw new Error(`Failed to link tracks: ${trackError.message}`);
      }
    }

    // Link speakers (unchanged)
    if (s.speakerNames.length > 0) {
      const speakerLinks = s.speakerNames
        .map((name) => speakerMap.get(name.toLowerCase()))
        .filter((id): id is string => !!id)
        .map((speakerId) => ({ session_id: session.id, speaker_id: speakerId }));

      if (speakerLinks.length > 0) {
        const { error: linkError } = await supabase
          .from("session_speakers")
          .insert(speakerLinks);

        if (linkError) throw new Error(`Failed to link speakers: ${linkError.message}`);
      }
    }
  }
```

Also update the track collection loop (lines 259-277) to handle arrays:

```typescript
  // 2. Collect unique track names that need creation
  const newTrackNames = new Set<string>();
  for (const s of sessions) {
    for (const name of s.trackNames) {
      if (name && !trackMap.has(name.toLowerCase())) {
        newTrackNames.add(name);
      }
    }
  }
```

**Step 7: Update existing tests**

Update `actions.test.ts` — the existing `createSession` test no longer sends `track_id`. Update the test that links speakers to also verify no `track_id` in session insert. Update the new test from Step 1.

**Step 8: Run tests**

Run: `cd apps/web && npx vitest run src/features/schedule/actions.test.ts --reporter=verbose 2>&1 | tail -30`
Expected: All PASS.

**Step 9: Commit**

```bash
git add apps/web/src/features/schedule/actions.ts apps/web/src/features/schedule/actions.test.ts
git commit -m "feat: update actions for many-to-many session tracks + bulk assign"
```

---

### Task 4: Update Conflict Check — track_ids Array

**Files:**
- Modify: `apps/web/src/features/schedule/conflict-check.ts`
- Modify: `apps/web/src/features/schedule/conflict-check.test.ts`

**Step 1: Update tests for track_ids array**

In `conflict-check.test.ts`, change all `track_id` references to `track_ids` arrays:

```typescript
const makeSession = (overrides: Partial<SessionForConflict>): SessionForConflict => ({
  id: "s1",
  title: "Session 1",
  start_time: "2026-09-11T09:00:00Z",
  end_time: "2026-09-11T10:00:00Z",
  location: null,
  track_ids: [],
  speaker_ids: [],
  ...overrides,
});
```

Update track conflict test:

```typescript
  it("detects track conflicts (shared track, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", track_ids: ["t1", "t2"], start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", track_ids: ["t1"], start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("track");
  });

  it("does not flag track conflict when tracks differ", () => {
    const sessions = [
      makeSession({ id: "s1", track_ids: ["t1"], start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", track_ids: ["t2"], start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    expect(detectConflicts(sessions).filter(c => c.type === "track")).toEqual([]);
  });
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/features/schedule/conflict-check.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: FAIL — `track_ids` not on type.

**Step 3: Update conflict-check.ts**

```typescript
export type SessionForConflict = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  track_ids: string[];
  speaker_ids: string[];
};
```

Update the track conflict detection (lines 57-64):

```typescript
      const sharedTracks = a.track_ids.filter((id) =>
        b.track_ids.includes(id)
      );
      if (sharedTracks.length > 0) {
        conflicts.push({
          type: "track",
          sessionIds: [a.id, b.id],
          sessionTitles: [a.title, b.title],
          detail: `${sharedTracks.length} shared track(s)`,
        });
      }
```

**Step 4: Run tests**

Run: `cd apps/web && npx vitest run src/features/schedule/conflict-check.test.ts --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

**Step 5: Update conflicts page**

Modify `apps/web/src/app/(organizer)/events/[eventId]/schedule/conflicts/page.tsx:16-24`:

```typescript
  const sessionsForCheck: SessionForConflict[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location,
    track_ids: s.session_tracks?.map((st: any) => st.track_id) ?? [],
    speaker_ids: s.session_speakers.map((ss: any) => ss.speaker_id),
  }));
```

**Step 6: Commit**

```bash
git add apps/web/src/features/schedule/conflict-check.ts apps/web/src/features/schedule/conflict-check.test.ts apps/web/src/app/\(organizer\)/events/\[eventId\]/schedule/conflicts/page.tsx
git commit -m "feat: update conflict check for many-to-many tracks"
```

---

### Task 5: Update CSV Import/Export — Semicolon-Separated Tracks

**Files:**
- Modify: `apps/web/src/features/schedule/csv-import.ts`
- Modify: `apps/web/src/features/schedule/csv-export.ts`

**Step 1: Update csv-import.ts**

Change `ParsedSession.trackName: string` to `trackNames: string[]`. Update parsing logic (line 111):

```typescript
export interface ParsedSession {
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string;
  trackNames: string[];
  speakerNames: string[];
}
```

In the parsing loop, change line 111:

```typescript
    const trackRaw = get(trackIdx);
    const trackNames = trackRaw
      ? trackRaw.split(";").map((s) => s.trim()).filter(Boolean)
      : [];

    results.push({
      title,
      description: get(descIdx),
      type,
      start_time: startTime,
      end_time: get(endIdx),
      location: get(locationIdx),
      trackNames,
      speakerNames,
    });
```

**Step 2: Update csv-export.ts**

Change `SessionForExport.track` from single to array. Update field output:

```typescript
export interface SessionForExport {
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  session_tracks: { tracks: { name: string } }[];
  session_speakers: { speakers: { name: string } }[];
}
```

Update the row mapping (line 32):

```typescript
export function sessionsToCSV(sessions: SessionForExport[]): string {
  const rows = sessions.map((s) => {
    const speakers = s.session_speakers.map((ss) => ss.speakers.name).join(";");
    const tracks = s.session_tracks.map((st) => st.tracks.name).join(";");
    const fields = [
      s.title,
      s.description ?? "",
      s.type,
      tracks,
      s.start_time,
      s.end_time,
      s.location ?? "",
      speakers,
    ];
    return fields.map(escapeCSVField).join(",");
  });

  return [HEADERS.join(","), ...rows].join("\n");
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/schedule/csv-import.ts apps/web/src/features/schedule/csv-export.ts
git commit -m "feat: update CSV import/export for multi-track sessions"
```

---

### Task 6: Update Session Form — Multi-Select Tracks

**Files:**
- Modify: `apps/web/src/features/schedule/components/session-form.tsx`
- Modify: `apps/web/src/features/schedule/components/session-form.test.tsx`

**Step 1: Update types and form state**

In `session-form.tsx`, change `track_id: string` to `track_ids: string[]` everywhere:

- `SessionFormData` type (line 33): `track_ids: string[]`
- `onSubmit` callback type (line 74): `track_ids: string[]`
- Form state initialization (line 101): `track_ids: session?.track_ids ?? []`

**Step 2: Replace track dropdown with multi-select checkboxes**

Replace the `<select>` for tracks (lines 451-466) with a checkbox list:

```tsx
{tracks.length > 0 && (
  <div className="space-y-1.5">
    <label className="text-sm font-medium">Tracks</label>
    <div className="flex flex-wrap gap-2">
      {tracks.map((t) => {
        const isSelected = form.track_ids.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                track_ids: isSelected
                  ? f.track_ids.filter((id) => id !== t.id)
                  : [...f.track_ids, t.id],
              }))
            }
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isSelected
                ? "border-transparent text-white"
                : "border-input bg-background hover:bg-accent"
            }`}
            style={isSelected ? { backgroundColor: t.color ?? "#6b7280" } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: t.color ?? "#6b7280" }}
            />
            {t.name}
          </button>
        );
      })}
    </div>
  </div>
)}
```

**Step 3: Update handleSubmit**

In the `handleSubmit` function (around line 300-320), change `track_id: form.track_id` to `track_ids: form.track_ids`.

**Step 4: Update tests**

In `session-form.test.tsx`, replace all `track_id: ""` with `track_ids: []`.

**Step 5: Run tests**

Run: `cd apps/web && npx vitest run src/features/schedule/components/session-form.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

**Step 6: Commit**

```bash
git add apps/web/src/features/schedule/components/session-form.tsx apps/web/src/features/schedule/components/session-form.test.tsx
git commit -m "feat: multi-select track pills in session form"
```

---

### Task 7: Update Session Timeline — Multi-Track Display + Bulk Select

**Files:**
- Modify: `apps/web/src/features/schedule/components/session-timeline.tsx`
- Modify: `apps/web/src/features/schedule/components/session-timeline.test.tsx`

**Step 1: Update Session type**

Change `track: Track | null` to `tracks: Track[]`:

```typescript
type Session = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  enable_check_in: boolean;
  rsvp_enabled: boolean;
  capacity: number | null;
  tracks: Track[];
  session_speakers: SessionSpeaker[];
  document_ids?: string[];
  poll_ids?: string[];
};
```

**Step 2: Update track display in cards**

Replace single track badge (lines 358-369) with loop:

```tsx
{session.tracks.length > 0 && session.tracks.map((track) => (
  <span
    key={track.id}
    className="flex items-center gap-1 text-[10px] font-medium"
    style={{ color: track.color ?? undefined }}
  >
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: track.color ?? "currentColor" }}
    />
    {track.name}
  </span>
))}
```

Update timeline dot color (line 334) to use first track:

```tsx
style={{ backgroundColor: session.tracks[0]?.color ?? (isBreak ? "var(--color-muted-foreground)" : "var(--color-primary)") }}
```

Update card border-left (line 343):

```tsx
borderLeftColor: isBreak ? undefined : (session.tracks[0]?.color ?? "transparent"),
```

**Step 3: Update handleCreate enrichment**

Change lines 167-174:

```typescript
const enriched: Session = {
  ...session,
  tracks: data.track_ids
    .map((tid) => tracks.find((t) => t.id === tid))
    .filter((t): t is Track => !!t),
  session_speakers: data.speaker_ids.map((sid) => ({
    speaker_id: sid,
    speakers: speakers.find((s) => s.id === sid)!,
  })),
};
```

**Step 4: Update handleUpdate**

Change line 230:

```typescript
tracks: data.track_ids
  .map((tid) => tracks.find((t) => t.id === tid))
  .filter((t): t is Track => !!t),
```

**Step 5: Update handleCreate/handleUpdate calls**

Change `track_id: data.track_id || undefined` to `track_ids: data.track_ids` in handleCreate (line 157).
Change `track_id: data.track_id || null` to `track_ids: data.track_ids` in handleUpdate (line 212).

**Step 6: Update editingSession prop passing**

Change line 461 from `track_id: editingSession.track?.id ?? ""` to:

```typescript
track_ids: editingSession.tracks.map((t) => t.id),
```

**Step 7: Add bulk selection state and UI**

Add to the component after existing state declarations:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [showBulkTracks, setShowBulkTracks] = useState(false);

function toggleSelect(sessionId: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(sessionId)) next.delete(sessionId);
    else next.add(sessionId);
    return next;
  });
}

function toggleSelectAll(daySessions: Session[]) {
  const allSelected = daySessions.every((s) => selectedIds.has(s.id));
  setSelectedIds((prev) => {
    const next = new Set(prev);
    for (const s of daySessions) {
      if (allSelected) next.delete(s.id);
      else next.add(s.id);
    }
    return next;
  });
}
```

**Step 8: Add checkbox to each session card**

Inside the session card `<div>`, before the Card component (after the timeline dot), add:

```tsx
<input
  type="checkbox"
  checked={selectedIds.has(session.id)}
  onChange={() => toggleSelect(session.id)}
  className="absolute -left-[55px] top-4 h-4 w-4 rounded border-muted-foreground accent-primary opacity-0 group-hover:opacity-100 transition-opacity"
  style={{ opacity: selectedIds.size > 0 ? 1 : undefined }}
/>
```

**Step 9: Add "Select All" per day**

After the day header `<div>` (line 322-323), add:

```tsx
<label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
  <input
    type="checkbox"
    checked={activeGroup.sessions.every((s) => selectedIds.has(s.id))}
    onChange={() => toggleSelectAll(activeGroup.sessions)}
    className="h-3.5 w-3.5 rounded accent-primary"
  />
  Select all
</label>
```

**Step 10: Add bulk action bar**

After the `{confirmDialog}` at the end of the component, add:

```tsx
{selectedIds.size > 0 && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
    <span className="text-sm font-medium">
      {selectedIds.size} session{selectedIds.size !== 1 ? "s" : ""} selected
    </span>
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowBulkTracks(!showBulkTracks)}
      >
        Assign Tracks
      </Button>
      {showBulkTracks && (
        <div className="absolute bottom-full mb-2 left-0 rounded-lg border bg-card p-3 shadow-lg min-w-[200px]">
          <div className="space-y-2">
            {tracks.map((track) => (
              <label key={track.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={track.id}
                  className="h-3.5 w-3.5 rounded accent-primary"
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: track.color ?? "#888" }}
                />
                {track.name}
              </label>
            ))}
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={async () => {
                const checkboxes = document.querySelectorAll<HTMLInputElement>(
                  ".bulk-track-checkbox"
                );
                // We'll use a ref-based approach instead — see implementation
                // For now this is the shape of the handler
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        setSelectedIds(new Set());
        setShowBulkTracks(false);
      }}
    >
      Clear
    </Button>
  </div>
)}
```

Note: The bulk tracks popover should use controlled state with `useState<string[]>` for selected track IDs, and call `bulkAssignTracks` on Apply. The exact implementation should use a `bulkTrackIds` state rather than DOM queries. Import `bulkAssignTracks` from actions.

**Step 11: Update tests**

In `session-timeline.test.tsx`, update all `track:` references to `tracks:` arrays.

**Step 12: Run tests**

Run: `cd apps/web && npx vitest run src/features/schedule/components/session-timeline.test.tsx --reporter=verbose 2>&1 | tail -20`
Expected: All PASS.

**Step 13: Commit**

```bash
git add apps/web/src/features/schedule/components/session-timeline.tsx apps/web/src/features/schedule/components/session-timeline.test.tsx
git commit -m "feat: multi-track display and bulk assign in session timeline"
```

---

### Task 8: Update Track Manager — Custom Hex Color Input

**Files:**
- Modify: `apps/web/src/features/schedule/components/track-manager.tsx`

**Step 1: Add hex input**

After the preset color dots (lines 119-127 in both the edit and add forms), add a hex text input:

```tsx
<input
  type="text"
  value={color}
  onChange={(e) => {
    const v = e.target.value;
    if (v === "" || v === "#" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
      setColor(v);
    }
  }}
  placeholder="#hex"
  className="w-16 rounded border bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring font-mono"
  maxLength={7}
/>
<span
  className="h-5 w-5 rounded-full border"
  style={{ backgroundColor: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : "#ccc" }}
/>
```

When a preset is clicked, it also updates the hex input (this already works since both read from `color` state).

**Step 2: Validate on submit**

In `handleAdd` and `handleUpdate`, validate the hex before submitting:

```typescript
async function handleAdd() {
  if (!name.trim()) return;
  const validColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : TRACK_COLORS[0];
  try {
    const track = await createTrack(eventId, { name: name.trim(), color: validColor });
    // ...
```

**Step 3: Commit**

```bash
git add apps/web/src/features/schedule/components/track-manager.tsx
git commit -m "feat: add custom hex color input to track manager"
```

---

### Task 9: Update Schedule Page — Wire New Data Shape

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/schedule/page.tsx`

**Step 1: Check current page**

The schedule page calls `getScheduleData()` and passes sessions to `SessionTimeline`. Sessions now have `session_tracks` instead of `track`. Need to map the data.

**Step 2: Update the session mapping**

Transform `session_tracks` to `tracks` array when passing to `SessionTimeline`:

```typescript
const mappedSessions = sessions.map((s) => ({
  ...s,
  tracks: s.session_tracks?.map((st: any) => st.tracks).filter(Boolean) ?? [],
}));
```

Pass `mappedSessions` instead of `sessions` to `SessionTimeline`.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/schedule/page.tsx
git commit -m "feat: map session_tracks to tracks array in schedule page"
```

---

### Task 10: Attendee App — Track Filter Bar

**Files:**
- Modify: `apps/attendee/src/app/(app)/[orgSlug]/[eventSlug]/page.tsx`

This page is a Server Component. We need to extract the schedule section into a Client Component for filtering.

**Step 1: Create AttendeeSchedule client component**

Create: `apps/attendee/src/features/schedule/components/attendee-schedule.tsx`

```tsx
"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge, Avatar } from "@attendly/ui/components";

type Track = { id: string; name: string; color: string | null };

type Session = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  tracks: Track[];
  session_speakers: { speaker_id: string; speakers: { id: string; name: string; title?: string | null; company?: string | null; photo?: string | null } }[];
};

const typeBadgeVariant: Record<string, "primary" | "info" | "success" | "warning" | "default"> = {
  keynote: "primary",
  talk: "info",
  workshop: "success",
  panel: "warning",
  break: "default",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AttendeeSchedule({
  sessions,
  tracks,
}: {
  sessions: Session[];
  tracks: Track[];
}) {
  const [activeTrackIds, setActiveTrackIds] = useState<Set<string>>(new Set());

  function toggleTrack(trackId: string) {
    setActiveTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  const filteredSessions =
    activeTrackIds.size === 0
      ? sessions
      : sessions.filter((s) =>
          s.tracks.some((t) => activeTrackIds.has(t.id))
        );

  // Group by day
  const dayGroups: Record<string, Session[]> = {};
  for (const s of filteredSessions) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (dayGroups[day] ??= []).push(s);
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <div className="h-6 w-1 rounded-full bg-primary" />
        <h2 className="text-lg font-semibold">Schedule</h2>
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {filteredSessions.filter((s) => s.type !== "break").length} sessions
        </span>
      </div>

      {/* Track filter bar */}
      {tracks.length > 0 && (
        <div className="sticky top-0 z-10 -mx-1 mt-3 flex items-center gap-2 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur-sm">
          {tracks.map((track) => {
            const isActive = activeTrackIds.has(track.id);
            return (
              <button
                key={track.id}
                onClick={() => toggleTrack(track.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-transparent text-white"
                    : "border-input bg-background hover:bg-accent"
                }`}
                style={isActive ? { backgroundColor: track.color ?? "#6b7280" } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: track.color ?? "#6b7280" }}
                />
                {track.name}
              </button>
            );
          })}
          {activeTrackIds.size > 0 && (
            <button
              onClick={() => setActiveTrackIds(new Set())}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Sessions by day */}
      <div className="mt-4 space-y-6">
        {Object.entries(dayGroups).map(([day, daySessions]) => (
          <div key={day}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {day}
            </h3>
            <div className="space-y-2">
              {daySessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 ${session.type === "break" ? "bg-muted/40" : "bg-card"}`}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: session.tracks[0]?.color ?? "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={typeBadgeVariant[session.type] ?? "default"}>
                          {session.type}
                        </Badge>
                        {session.tracks.map((track) => (
                          <span key={track.id} className="text-[10px] text-muted-foreground">
                            {track.name}
                          </span>
                        ))}
                      </div>
                      <h4 className="mt-1.5 font-medium text-sm">
                        {session.title}
                      </h4>
                      {session.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {session.description}
                        </p>
                      )}
                      {session.session_speakers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {session.session_speakers.map(({ speakers: sp }: any) => (
                            <div key={sp.id} className="flex items-center gap-1.5">
                              <Avatar src={sp.photo} name={sp.name} size="sm" className="h-5 w-5" />
                              <span className="text-[11px] font-medium">{sp.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.start_time)}
                      </div>
                      {session.location && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Update attendee page**

In `page.tsx`, update the sessions query to use `session_tracks` join, fetch tracks separately, map the data, and use the new component:

Update the sessions query (lines 114-120):

```typescript
  // Fetch sessions with tracks and speakers
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "*, session_tracks(track_id, tracks(id, name, color)), session_speakers(speaker_id, speakers(id, name, title, company, photo))"
    )
    .eq("event_id", event.id)
    .order("start_time");

  // Fetch tracks for filter bar
  const { data: eventTracks } = await supabase
    .from("tracks")
    .select("id, name, color")
    .eq("event_id", event.id)
    .order("sort_order");
```

Map sessions before passing to component:

```typescript
  const mappedSessions = (sessions ?? []).map((s) => ({
    ...s,
    tracks: s.session_tracks?.map((st: any) => st.tracks).filter(Boolean) ?? [],
  }));
```

Replace the inline schedule section (lines 357-449) with:

```tsx
{sessions && sessions.length > 0 && (
  <AttendeeSchedule
    sessions={mappedSessions}
    tracks={eventTracks ?? []}
  />
)}
```

Add import at top:

```typescript
import { AttendeeSchedule } from "@/features/schedule/components/attendee-schedule";
```

**Step 3: Commit**

```bash
git add apps/attendee/src/features/schedule/components/attendee-schedule.tsx apps/attendee/src/app/\(app\)/\[orgSlug\]/\[eventSlug\]/page.tsx
git commit -m "feat: add attendee-side track filtering with pill toggle bar"
```

---

### Task 11: Final Integration — Run Full Test Suite and Fix Any Issues

**Step 1: Run all schedule tests**

Run: `cd apps/web && npx vitest run src/features/schedule/ --reporter=verbose 2>&1 | tail -40`
Expected: All PASS.

**Step 2: Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | tail -30`
Expected: No errors.

**Step 3: Run attendee app TypeScript check**

Run: `cd apps/attendee && npx tsc --noEmit 2>&1 | tail -30`
Expected: No errors.

**Step 4: Fix any remaining issues**

Address any type errors or test failures discovered.

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: resolve remaining type errors from track manager migration"
```
