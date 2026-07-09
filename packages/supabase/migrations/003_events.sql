-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  timezone text not null default 'UTC',
  venue_name text,
  venue_address text,
  is_virtual boolean not null default false,
  virtual_url text,
  cover_image text,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  theme jsonb default '{}',
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

alter table public.events enable row level security;

-- Public can view published events
create policy "Published events are publicly viewable"
  on public.events for select
  using (status = 'published' or public.is_org_member(organization_id));

create policy "Editors can create events"
  on public.events for insert
  with check (public.is_org_member(organization_id, 'editor'));

create policy "Editors can update events"
  on public.events for update
  using (public.is_org_member(organization_id, 'editor'));

create policy "Admins can delete events"
  on public.events for delete
  using (public.is_org_member(organization_id, 'admin'));

-- Tracks
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;

create policy "Tracks follow event visibility"
  on public.tracks for select
  using (exists (
    select 1 from public.events
    where events.id = tracks.event_id
      and (events.status = 'published' or public.is_org_member(events.organization_id))
  ));

create policy "Editors can manage tracks"
  on public.tracks for all
  using (exists (
    select 1 from public.events
    where events.id = tracks.event_id
      and public.is_org_member(events.organization_id, 'editor')
  ));
