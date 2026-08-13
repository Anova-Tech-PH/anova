# Track Manager — Whova Parity Design

## Overview

Enhance Attendly's Track Manager to match Whova's feature set. Four features:

1. Multiple tracks per session (many-to-many)
2. Bulk assign tracks to sessions
3. Attendee-side track filtering
4. Custom hex color input

## 1. Database — Many-to-Many Migration

**Current**: `sessions.track_id` nullable FK (one-to-one).

**Change**: New junction table, migrate data, drop old column.

```sql
CREATE TABLE public.session_tracks (
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  track_id   uuid REFERENCES public.tracks(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, track_id)
);

INSERT INTO public.session_tracks (session_id, track_id)
SELECT id, track_id FROM public.sessions WHERE track_id IS NOT NULL;

ALTER TABLE public.sessions DROP COLUMN track_id;
```

RLS policies mirror session/track visibility. Indexes on both FK columns.

**Code impact**:
- Queries: join through `session_tracks` instead of direct FK
- Actions: insert/delete junction rows instead of setting `track_id`
- Session form: multi-select instead of single dropdown
- CSV import/export: semicolon-separated track names
- Conflict check: iterate shared tracks between session pairs

## 2. Custom Hex Color Input

Keep 8 preset color dots. Add a hex text input beside them.

- Shows current hex value (e.g. `#3b82f6`)
- User can type any valid hex to override presets
- Validates `#` + 3 or 6 hex chars, rejects invalid input
- Typing updates preview in real-time

## 3. Bulk Assign Tracks on Session Timeline

Add multi-select mode to existing session timeline.

- Checkbox on each session card (visible on hover or in select mode)
- "Select All" toggle per day group
- Bulk action bar (fixed bottom) when >= 1 session selected:
  - "X sessions selected" count
  - "Assign Tracks" button — popover with track checkboxes, add/remove tracks from all selected sessions
  - "Clear Selection" button
- Server action: `bulkAssignTracks(eventId, sessionIds[], trackIds[])` — replaces track assignments in single transaction

## 4. Attendee-Side Track Filtering

Add horizontal filter bar above the attendee schedule.

- Row of track pills (colored dot + name), horizontally scrollable
- Toggle: tap to activate/deactivate, multiple can be active
- Filter logic: show sessions matching ANY selected track; none selected = show all
- Client-side filtering on already-fetched data
- Sticky below header when scrolling
- "Clear" button when any filter active
- Query: join through `session_tracks` to fetch tracks per session

## Files Affected

### Database
- New migration: `session_tracks` junction table + data migration + drop `track_id`

### Organizer Web App
- `features/schedule/actions.ts` — createSession, updateSession, deleteTrack, bulkImportSessions, new bulkAssignTracks
- `features/schedule/queries.ts` — getSessionsByEvent, getScheduleData join changes
- `features/schedule/components/track-manager.tsx` — add hex input
- `features/schedule/components/session-form.tsx` — multi-select tracks
- `features/schedule/components/session-timeline.tsx` — checkboxes, bulk action bar, multi-track display
- `features/schedule/conflict-check.ts` — iterate shared tracks
- `features/schedule/csv-import.ts` — semicolon-separated tracks
- `features/schedule/csv-export.ts` — semicolon-joined track names

### Attendee App
- `apps/attendee/src/app/(app)/[orgSlug]/[eventSlug]/page.tsx` — track filter bar, updated query
