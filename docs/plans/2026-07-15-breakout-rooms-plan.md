# Breakout Rooms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add breakout rooms to Attendly events — standalone (Type A) and session-linked (Type B) — with organizer CRUD, attendee join/leave, and optional chat.

**Architecture:** New `breakout_rooms` and `breakout_room_participants` tables with RLS. Feature module at `features/breakout-rooms/` following existing patterns (server actions, queries, components). Three new pages: organizer management, attendee browser, public listing.

**Tech Stack:** Supabase (migration + RLS), Next.js server actions, React client components with shadcn/ui patterns.

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/009_breakout_rooms.sql`

**Step 1: Write the migration**

```sql
-- Breakout rooms
create table public.breakout_rooms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  description text,
  facilitator_name text,
  location text,
  max_capacity int,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'full', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.breakout_rooms enable row level security;

-- Anyone who can see the event can see its rooms
create policy "Rooms visible to event viewers"
  on public.breakout_rooms for select
  using (
    exists (
      select 1 from public.events e
      where e.id = breakout_rooms.event_id
        and (e.status = 'published' or exists (
          select 1 from public.organization_members om
          where om.org_id = e.org_id and om.user_id = auth.uid()
        ))
    )
  );

-- Org editors can manage rooms
create policy "Org editors can insert rooms"
  on public.breakout_rooms for insert
  with check (
    exists (
      select 1 from public.events e
      join public.organization_members om on om.org_id = e.org_id
      where e.id = breakout_rooms.event_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin', 'editor')
    )
  );

create policy "Org editors can update rooms"
  on public.breakout_rooms for update
  using (
    exists (
      select 1 from public.events e
      join public.organization_members om on om.org_id = e.org_id
      where e.id = breakout_rooms.event_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin', 'editor')
    )
  );

create policy "Org editors can delete rooms"
  on public.breakout_rooms for delete
  using (
    exists (
      select 1 from public.events e
      join public.organization_members om on om.org_id = e.org_id
      where e.id = breakout_rooms.event_id
        and om.user_id = auth.uid()
        and om.role in ('owner', 'admin', 'editor')
    )
  );

-- Breakout room participants
create table public.breakout_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.breakout_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

alter table public.breakout_room_participants enable row level security;

-- Anyone who can see the room can see participants
create policy "Participants visible to event viewers"
  on public.breakout_room_participants for select
  using (
    exists (
      select 1 from public.breakout_rooms br
      join public.events e on e.id = br.event_id
      where br.id = breakout_room_participants.room_id
        and (e.status = 'published' or exists (
          select 1 from public.organization_members om
          where om.org_id = e.org_id and om.user_id = auth.uid()
        ))
    )
  );

-- Event attendees can join rooms
create policy "Event attendees can join rooms"
  on public.breakout_room_participants for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.breakout_rooms br
      where br.id = breakout_room_participants.room_id
        and public.is_event_attendee(br.event_id)
    )
  );

-- Users can leave rooms (delete own row)
create policy "Users can leave rooms"
  on public.breakout_room_participants for delete
  using (user_id = auth.uid());

-- Indexes
create index idx_breakout_rooms_event on public.breakout_rooms(event_id);
create index idx_breakout_rooms_session on public.breakout_rooms(session_id) where session_id is not null;
create index idx_breakout_room_participants_room on public.breakout_room_participants(room_id);
create index idx_breakout_room_participants_user on public.breakout_room_participants(user_id);
```

**Step 2: Apply the migration**

Run: `cd packages/supabase && npx supabase db reset`
Expected: All migrations apply successfully including 009.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/009_breakout_rooms.sql
git commit -m "feat: add breakout_rooms migration with RLS"
```

---

### Task 2: Constants and Types

**Files:**
- Modify: `packages/shared/src/constants/index.ts`

**Step 1: Add breakout room constants**

Add to the end of the file:

```typescript
export const BREAKOUT_ROOM_STATUS = {
  OPEN: "open",
  FULL: "full",
  CLOSED: "closed",
} as const;

export type BreakoutRoomStatus =
  (typeof BREAKOUT_ROOM_STATUS)[keyof typeof BREAKOUT_ROOM_STATUS];

// Add to existing LIMITS object:
// MAX_ROOMS_PER_EVENT: 50,
// MAX_ROOM_CAPACITY: 500,
```

Also add `MAX_ROOMS_PER_EVENT: 50` and `MAX_ROOM_CAPACITY: 500` to the existing `LIMITS` object.

**Step 2: Commit**

```bash
git add packages/shared/src/constants/index.ts
git commit -m "feat: add breakout room constants"
```

---

### Task 3: Server Actions

**Files:**
- Create: `apps/web/src/features/breakout-rooms/actions.ts`

**Step 1: Write server actions**

Follow the pattern from `features/schedule/actions.ts`. Five actions:

```typescript
"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRoom(eventId: string, data: {
  title: string;
  description?: string;
  facilitator_name?: string;
  location?: string;
  max_capacity?: number | null;
  starts_at: string;
  ends_at: string;
  session_id?: string | null;
}) {
  const supabase = await createClient();

  const { data: room, error } = await supabase
    .from("breakout_rooms")
    .insert({
      event_id: eventId,
      title: data.title,
      description: data.description || null,
      facilitator_name: data.facilitator_name || null,
      location: data.location || null,
      max_capacity: data.max_capacity ?? null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      session_id: data.session_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/rooms`);
  return room;
}

export async function updateRoom(eventId: string, roomId: string, data: {
  title?: string;
  description?: string | null;
  facilitator_name?: string | null;
  location?: string | null;
  max_capacity?: number | null;
  starts_at?: string;
  ends_at?: string;
  session_id?: string | null;
  status?: string;
}) {
  const supabase = await createClient();

  if (data.status) {
    const valid = ["open", "full", "closed"];
    if (!valid.includes(data.status)) {
      throw new Error(`Invalid status: ${data.status}`);
    }
  }

  const { error } = await supabase
    .from("breakout_rooms")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/rooms`);
}

export async function deleteRoom(eventId: string, roomId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breakout_rooms")
    .delete()
    .eq("id", roomId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/rooms`);
}

export async function joinRoom(roomId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Check room exists and is open
  const { data: room } = await supabase
    .from("breakout_rooms")
    .select("id, max_capacity, status, event_id")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");
  if (room.status === "closed") throw new Error("Room is closed");

  // Check capacity
  if (room.max_capacity) {
    const { count } = await supabase
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      throw new Error("Room is full");
    }
  }

  const { error } = await supabase
    .from("breakout_room_participants")
    .insert({ room_id: roomId, user_id: user.id });

  if (error) {
    if (error.code === "23505") throw new Error("Already joined this room");
    throw new Error(error.message);
  }

  // Auto-update status to full if at capacity
  if (room.max_capacity) {
    const { count } = await supabase
      .from("breakout_room_participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId);

    if (count !== null && count >= room.max_capacity) {
      await supabase
        .from("breakout_rooms")
        .update({ status: "full", updated_at: new Date().toISOString() })
        .eq("id", roomId);
    }
  }

  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}

export async function leaveRoom(roomId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Get room for revalidation and status update
  const { data: room } = await supabase
    .from("breakout_rooms")
    .select("id, event_id, status, max_capacity")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Room not found");

  const { error } = await supabase
    .from("breakout_room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  // If room was full, reopen it
  if (room.status === "full") {
    await supabase
      .from("breakout_rooms")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", roomId);
  }

  revalidatePath(`/events/${room.event_id}/rooms`);
  revalidatePath("/rooms");
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/breakout-rooms/actions.ts
git commit -m "feat: add breakout room server actions"
```

---

### Task 4: Queries

**Files:**
- Create: `apps/web/src/features/breakout-rooms/queries.ts`

**Step 1: Write query functions**

Follow the pattern from `features/schedule/queries.ts`:

```typescript
import { createClient } from "@/shared/utils/supabase/server";

export async function getRoomsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id, joined_at)
    `)
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getRoomById(roomId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breakout_rooms")
    .select(`
      *,
      sessions(id, title),
      breakout_room_participants(id, user_id, joined_at, profiles:user_id(full_name, avatar_url))
    `)
    .eq("id", roomId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyRooms(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breakout_room_participants")
    .select(`
      room_id,
      joined_at,
      breakout_rooms(*)
    `)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/breakout-rooms/queries.ts
git commit -m "feat: add breakout room queries"
```

---

### Task 5: Organizer Room List Component

**Files:**
- Create: `apps/web/src/features/breakout-rooms/components/room-list.tsx`

**Step 1: Write the room list component**

Follow the pattern from `features/tickets/components/ticket-list.tsx` — client component with CRUD modals:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Users, Clock, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteRoom } from "../actions";
import { RoomForm } from "./room-form";

type Room = {
  id: string;
  title: string;
  description: string | null;
  facilitator_name: string | null;
  location: string | null;
  max_capacity: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  session_id: string | null;
  sessions: { id: string; title: string } | null;
  breakout_room_participants: { id: string }[];
};

export function RoomList({
  eventId,
  rooms,
  sessions,
}: {
  eventId: string;
  rooms: Room[];
  sessions: { id: string; title: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(roomId: string) {
    if (!confirm("Delete this breakout room?")) return;
    startTransition(async () => {
      try {
        await deleteRoom(eventId, roomId);
        toast.success("Room deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Breakout Rooms</h2>
        <button
          onClick={() => { setEditingRoom(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No breakout rooms yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create rooms for discussions, networking, or post-session breakouts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-start justify-between rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{room.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    room.status === "open" ? "bg-green-100 text-green-700"
                      : room.status === "full" ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {room.status}
                  </span>
                </div>
                {room.description && (
                  <p className="text-sm text-muted-foreground">{room.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(room.starts_at).toLocaleString()} - {new Date(room.ends_at).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {room.breakout_room_participants.length}{room.max_capacity ? ` / ${room.max_capacity}` : ""} joined
                  </span>
                  {room.sessions && (
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {room.sessions.title}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingRoom(room); setShowForm(true); }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(room.id)}
                  disabled={isPending}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RoomForm
          eventId={eventId}
          room={editingRoom}
          sessions={sessions}
          onClose={() => { setShowForm(false); setEditingRoom(null); }}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/breakout-rooms/components/room-list.tsx
git commit -m "feat: add organizer room list component"
```

---

### Task 6: Room Form Component

**Files:**
- Create: `apps/web/src/features/breakout-rooms/components/room-form.tsx`

**Step 1: Write the create/edit form modal**

```tsx
"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createRoom, updateRoom } from "../actions";

type RoomData = {
  id: string;
  title: string;
  description: string | null;
  facilitator_name: string | null;
  location: string | null;
  max_capacity: number | null;
  starts_at: string;
  ends_at: string;
  session_id: string | null;
  status: string;
};

export function RoomForm({
  eventId,
  room,
  sessions,
  onClose,
}: {
  eventId: string;
  room: RoomData | null;
  sessions: { id: string; title: string }[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [hasCapacity, setHasCapacity] = useState(room?.max_capacity != null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      facilitator_name: (formData.get("facilitator_name") as string) || null,
      location: (formData.get("location") as string) || null,
      max_capacity: hasCapacity ? Number(formData.get("max_capacity")) : null,
      starts_at: formData.get("starts_at") as string,
      ends_at: formData.get("ends_at") as string,
      session_id: (formData.get("session_id") as string) || null,
    };

    startTransition(async () => {
      try {
        if (room) {
          await updateRoom(eventId, room.id, data);
          toast.success("Room updated");
        } else {
          await createRoom(eventId, data);
          toast.success("Room created");
        }
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  // Format datetime for input[type="datetime-local"]
  function toLocalInput(iso: string) {
    return iso ? new Date(iso).toISOString().slice(0, 16) : "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{room ? "Edit Room" : "Create Room"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <input
              name="title"
              required
              defaultValue={room?.title ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={room?.description ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Facilitator</label>
              <input
                name="facilitator_name"
                defaultValue={room?.facilitator_name ?? ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <input
                name="location"
                defaultValue={room?.location ?? ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Starts at *</label>
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={room ? toLocalInput(room.starts_at) : ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ends at *</label>
              <input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={room ? toLocalInput(room.ends_at) : ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-capacity"
                checked={hasCapacity}
                onChange={(e) => setHasCapacity(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <label htmlFor="has-capacity" className="text-sm font-medium">Limit capacity</label>
            </div>
            {hasCapacity && (
              <input
                name="max_capacity"
                type="number"
                min={1}
                max={500}
                defaultValue={room?.max_capacity ?? 30}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          {sessions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Linked Session (optional)</label>
              <select
                name="session_id"
                defaultValue={room?.session_id ?? ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Standalone room (no linked session)</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Saving..." : room ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/breakout-rooms/components/room-form.tsx
git commit -m "feat: add room create/edit form component"
```

---

### Task 7: Organizer Rooms Page

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/rooms/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/page.tsx` (add Rooms tab)

**Step 1: Create the organizer rooms page**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getRoomsByEvent } from "@/features/breakout-rooms/queries";
import { RoomList } from "@/features/breakout-rooms/components/room-list";

export default async function OrganizerRoomsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const rooms = await getRoomsByEvent(eventId);

  // Fetch sessions for linking
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  return <RoomList eventId={eventId} rooms={rooms} sessions={sessions ?? []} />;
}
```

**Step 2: Add Rooms tab to event detail page**

In `apps/web/src/app/(organizer)/events/[eventId]/page.tsx`, add to the imports:

```tsx
import { DoorOpen } from "lucide-react";
```

And add to the `tabs` array (between Check-in and Analytics):

```tsx
{ href: `/events/${eventId}/rooms`, label: "Rooms", icon: DoorOpen },
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(organizer)/events/[eventId]/rooms/page.tsx
git add apps/web/src/app/(organizer)/events/[eventId]/page.tsx
git commit -m "feat: add organizer rooms page with tab navigation"
```

---

### Task 8: Attendee Room Card Component

**Files:**
- Create: `apps/web/src/features/breakout-rooms/components/room-card.tsx`

**Step 1: Write the attendee room card**

```tsx
"use client";

import { useTransition } from "react";
import { Users, Clock, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { joinRoom, leaveRoom } from "../actions";

type Room = {
  id: string;
  title: string;
  description: string | null;
  facilitator_name: string | null;
  location: string | null;
  max_capacity: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  sessions: { id: string; title: string } | null;
  breakout_room_participants: { id: string; user_id: string }[];
};

export function RoomCard({
  room,
  currentUserId,
}: {
  room: Room;
  currentUserId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const isJoined = currentUserId
    ? room.breakout_room_participants.some((p) => p.user_id === currentUserId)
    : false;
  const participantCount = room.breakout_room_participants.length;
  const isFull = room.max_capacity ? participantCount >= room.max_capacity : false;
  const isClosed = room.status === "closed";

  function handleToggle() {
    if (!currentUserId) {
      toast.error("Sign in to join rooms");
      return;
    }
    startTransition(async () => {
      try {
        if (isJoined) {
          await leaveRoom(room.id);
          toast.success("Left room");
        } else {
          await joinRoom(room.id);
          toast.success("Joined room");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{room.title}</h3>
          {room.sessions && (
            <p className="text-xs text-muted-foreground">Session: {room.sessions.title}</p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isClosed ? "bg-gray-100 text-gray-700"
            : isFull ? "bg-yellow-100 text-yellow-700"
            : "bg-green-100 text-green-700"
        }`}>
          {isClosed ? "Closed" : isFull ? "Full" : "Open"}
        </span>
      </div>

      {room.description && (
        <p className="text-sm text-muted-foreground">{room.description}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(room.starts_at).toLocaleString()} - {new Date(room.ends_at).toLocaleTimeString()}
        </span>
        {room.facilitator_name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {room.facilitator_name}
          </span>
        )}
        {room.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {room.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {participantCount}{room.max_capacity ? ` / ${room.max_capacity}` : ""}
        </span>
      </div>

      {currentUserId && !isClosed && (
        <button
          onClick={handleToggle}
          disabled={isPending || (!isJoined && isFull)}
          className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            isJoined
              ? "border hover:bg-accent"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isPending ? "..." : isJoined ? "Leave Room" : isFull ? "Full" : "Join Room"}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/breakout-rooms/components/room-card.tsx
git commit -m "feat: add attendee room card with join/leave"
```

---

### Task 9: Attendee Room Browser Component

**Files:**
- Create: `apps/web/src/features/breakout-rooms/components/room-browser.tsx`

**Step 1: Write the room browser**

```tsx
"use client";

import { useState } from "react";
import { RoomCard } from "./room-card";

type Room = {
  id: string;
  title: string;
  description: string | null;
  facilitator_name: string | null;
  location: string | null;
  max_capacity: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  sessions: { id: string; title: string } | null;
  breakout_room_participants: { id: string; user_id: string }[];
};

type Filter = "all" | "upcoming" | "active" | "past";

export function RoomBrowser({
  rooms,
  currentUserId,
}: {
  rooms: Room[];
  currentUserId: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const now = new Date();
  const filtered = rooms.filter((room) => {
    if (filter === "all") return true;
    const start = new Date(room.starts_at);
    const end = new Date(room.ends_at);
    if (filter === "upcoming") return start > now;
    if (filter === "active") return start <= now && end >= now;
    if (filter === "past") return end < now;
    return true;
  });

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "active", label: "Active Now" },
    { value: "past", label: "Past" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Breakout Rooms</h1>
      </div>

      <div className="flex gap-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No rooms found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/breakout-rooms/components/room-browser.tsx
git commit -m "feat: add attendee room browser with filtering"
```

---

### Task 10: Attendee Rooms Page

**Files:**
- Create: `apps/web/src/app/(attendee)/rooms/page.tsx`
- Modify: `apps/web/src/app/(attendee)/layout.tsx` (add Rooms nav item)

**Step 1: Create the attendee rooms page**

```tsx
import { createClient } from "@/shared/utils/supabase/server";
import { RoomBrowser } from "@/features/breakout-rooms/components/room-browser";

export default async function AttendeeRoomsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get rooms from all events the user is registered for
  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id")
    .eq("user_id", user?.id ?? "")
    .in("status", ["confirmed", "checked_in"]);

  const eventIds = registrations?.map((r) => r.event_id) ?? [];

  let rooms: any[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("breakout_rooms")
      .select(`
        *,
        sessions(id, title),
        breakout_room_participants(id, user_id)
      `)
      .in("event_id", eventIds)
      .order("starts_at", { ascending: true });

    rooms = data ?? [];
  }

  return <RoomBrowser rooms={rooms} currentUserId={user?.id ?? null} />;
}
```

**Step 2: Add Rooms to attendee sidebar**

In `apps/web/src/app/(attendee)/layout.tsx`, add to imports:

```tsx
import { DoorOpen } from "lucide-react";
```

Add to the `tabs` array (after Messages, before People):

```tsx
{ href: "/rooms", label: "Rooms", icon: DoorOpen },
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(attendee)/rooms/page.tsx
git add apps/web/src/app/(attendee)/layout.tsx
git commit -m "feat: add attendee rooms page and navigation"
```

---

### Task 11: Public Rooms Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/rooms/page.tsx`

**Step 1: Create the public rooms page**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";

export default async function PublicRoomsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("org_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: rooms } = await supabase
    .from("breakout_rooms")
    .select(`
      id, title, description, facilitator_name, location,
      max_capacity, starts_at, ends_at, status,
      sessions(id, title),
      breakout_room_participants(id)
    `)
    .eq("event_id", event.id)
    .order("starts_at", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Breakout Rooms</h1>

      {!rooms || rooms.length === 0 ? (
        <p className="text-muted-foreground">No breakout rooms scheduled.</p>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="rounded-xl border bg-card p-5 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-medium">{room.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  room.status === "open" ? "bg-green-100 text-green-700"
                    : room.status === "full" ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {room.status}
                </span>
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground">{room.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{new Date(room.starts_at).toLocaleString()} - {new Date(room.ends_at).toLocaleTimeString()}</span>
                {room.facilitator_name && <span>Facilitator: {room.facilitator_name}</span>}
                {room.location && <span>Location: {room.location}</span>}
                <span>{room.breakout_room_participants.length}{room.max_capacity ? ` / ${room.max_capacity}` : ""} joined</span>
                {room.sessions && <span>Session: {room.sessions.title}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/(public)/[orgSlug]/[eventSlug]/rooms/page.tsx
git commit -m "feat: add public rooms listing page"
```

---

### Task 12: Verify Everything Works

**Step 1: Reset Supabase and apply all migrations**

Run: `cd packages/supabase && npx supabase db reset`
Expected: All 9 migrations apply successfully.

**Step 2: Start the dev server**

Run: `cd apps/web && pnpm dev`
Expected: No TypeScript errors. Server starts successfully.

**Step 3: Test organizer rooms page**

Navigate to an event detail page and verify the "Rooms" tab appears. Click it. Verify the empty state renders. Create a room and verify it appears in the list.

**Step 4: Test attendee rooms page**

Navigate to `/rooms` in the attendee layout. Verify it renders. If the user has event registrations with rooms, verify room cards appear with join/leave buttons.

**Step 5: Test public rooms page**

Navigate to `/{orgSlug}/{eventSlug}/rooms`. Verify the public listing renders correctly.

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: breakout rooms - complete feature implementation"
```
