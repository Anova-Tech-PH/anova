# Breakout Rooms Design

## Overview

Add breakout rooms to Attendly events. Two flavors:
- **Standalone rooms** (Type A): Themed discussion rooms for networking/unconference (no parent session)
- **Session-linked rooms** (Type B): Post-session breakouts tied to a parent session

Organizers create and manage rooms. Attendees browse, join (open or capacity-limited), and optionally chat within rooms.

## Data Model

### `breakout_rooms` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| event_id | uuid | FK -> events, NOT NULL |
| session_id | uuid | FK -> sessions, nullable. Set = Type B, null = Type A |
| conversation_id | uuid | FK -> conversations, nullable. Lazily created on first chat message |
| title | text | NOT NULL |
| description | text | Optional |
| facilitator_name | text | Optional |
| location | text | Physical room or virtual link |
| max_capacity | int | Nullable = unlimited/open join |
| starts_at | timestamptz | NOT NULL |
| ends_at | timestamptz | NOT NULL |
| status | text | CHECK: open, full, closed. Default: open |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

### `breakout_room_participants` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| room_id | uuid | FK -> breakout_rooms, NOT NULL |
| user_id | uuid | FK -> auth.users, NOT NULL |
| joined_at | timestamptz | Default now() |
| UNIQUE(room_id, user_id) | | Prevent duplicate joins |

### RLS Policies

- **breakout_rooms SELECT**: Follows event visibility (published OR org member)
- **breakout_rooms INSERT/UPDATE/DELETE**: Org editors only
- **participants INSERT**: Event attendees can join (`is_event_attendee`)
- **participants DELETE**: Users can remove themselves (`user_id = auth.uid()`)
- **participants SELECT**: Follows event visibility

## UI

### Organizer

- New "Rooms" tab on event detail page (7th tab alongside Schedule, Tickets, etc.)
- Room list showing title, time, participant count / capacity, linked session
- Create/edit modal: title, description, facilitator, location, capacity (toggle unlimited), time range, optional session link
- Delete room with confirmation

### Attendee

- "Rooms" entry in attendee sidebar navigation
- Room browser: cards showing title, description, facilitator, time, capacity status
- Join/Leave button with real-time capacity indicator
- Chat thread per room (reuses existing conversation/messaging components)
- Filter by: upcoming, active now, past

### Public

- Breakout rooms listed on public event schedule page

## Feature Module

```
features/breakout-rooms/
  actions.ts          - createRoom, updateRoom, deleteRoom, joinRoom, leaveRoom
  queries.ts          - getRoomsByEvent, getRoomParticipants, getMyRooms
  components/
    room-form.tsx     - Create/edit modal
    room-list.tsx     - Organizer room management list
    room-card.tsx     - Attendee room card with join/leave
    room-browser.tsx  - Attendee room browsing view
```

## Pages

- `(organizer)/events/[eventId]/rooms/page.tsx` - Organizer room management
- `(attendee)/rooms/page.tsx` - Attendee room browser
- `(public)/[orgSlug]/[eventSlug]/rooms/page.tsx` - Public room listing

## Constants

Add `BREAKOUT_ROOM_STATUS`: open, full, closed
Add `LIMITS.MAX_ROOMS_PER_EVENT`: 50
Add `LIMITS.MAX_ROOM_CAPACITY`: 500
