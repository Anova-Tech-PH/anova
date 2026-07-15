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
          where om.organization_id = e.organization_id and om.user_id = auth.uid()
        ))
    )
  );

-- Org editors can manage rooms
create policy "Org editors can insert rooms"
  on public.breakout_rooms for insert
  with check (
    exists (
      select 1 from public.events e
      join public.organization_members om on om.organization_id = e.organization_id
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
      join public.organization_members om on om.organization_id = e.organization_id
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
      join public.organization_members om on om.organization_id = e.organization_id
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
          where om.organization_id = e.organization_id and om.user_id = auth.uid()
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
