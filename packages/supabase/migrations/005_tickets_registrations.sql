-- Helper function for checking event attendee status
create or replace function public.is_event_attendee(_event_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.registrations
    where event_id = _event_id
      and user_id = auth.uid()
      and status in ('confirmed', 'checked_in')
  );
end;
$$ language plpgsql security definer stable;

-- Ticket types
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  type text not null default 'free' check (type in ('free', 'paid')),
  price numeric(10, 2) not null default 0,
  quantity int,
  sales_start timestamptz,
  sales_end timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticket_types enable row level security;

create policy "Ticket types follow event visibility"
  on public.ticket_types for select
  using (exists (
    select 1 from public.events
    where events.id = ticket_types.event_id
      and (events.status = 'published' or public.is_org_member(events.organization_id))
  ));

create policy "Editors can manage ticket types"
  on public.ticket_types for all
  using (exists (
    select 1 from public.events
    where events.id = ticket_types.event_id
      and public.is_org_member(events.organization_id, 'editor')
  ));

-- Registrations
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'checked_in')),
  qr_code text not null unique,
  checked_in_at timestamptz,
  custom_fields jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registrations enable row level security;

-- Users can view their own registrations
create policy "Users can view own registrations"
  on public.registrations for select
  using (user_id = auth.uid() or exists (
    select 1 from public.events
    where events.id = registrations.event_id
      and public.is_org_member(events.organization_id)
  ));

-- Anyone can register (insert)
create policy "Anyone can register for events"
  on public.registrations for insert
  with check (exists (
    select 1 from public.events
    where events.id = event_id and events.status = 'published'
  ));

-- Organizers can update registrations
create policy "Organizers can update registrations"
  on public.registrations for update
  using (exists (
    select 1 from public.events
    where events.id = registrations.event_id
      and public.is_org_member(events.organization_id, 'editor')
  ));

-- Session bookmarks
create table public.session_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

alter table public.session_bookmarks enable row level security;

create policy "Users can manage own bookmarks"
  on public.session_bookmarks for all
  using (user_id = auth.uid());
