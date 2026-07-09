-- Speakers
create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  title text,
  company text,
  bio text,
  photo text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.speakers enable row level security;

create policy "Speakers follow event visibility"
  on public.speakers for select
  using (exists (
    select 1 from public.events
    where events.id = speakers.event_id
      and (events.status = 'published' or public.is_org_member(events.organization_id))
  ));

create policy "Editors can manage speakers"
  on public.speakers for all
  using (exists (
    select 1 from public.events
    where events.id = speakers.event_id
      and public.is_org_member(events.organization_id, 'editor')
  ));

-- Sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete set null,
  title text not null,
  description text,
  type text not null default 'talk' check (type in ('talk', 'workshop', 'panel', 'keynote', 'break')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Sessions follow event visibility"
  on public.sessions for select
  using (exists (
    select 1 from public.events
    where events.id = sessions.event_id
      and (events.status = 'published' or public.is_org_member(events.organization_id))
  ));

create policy "Editors can manage sessions"
  on public.sessions for all
  using (exists (
    select 1 from public.events
    where events.id = sessions.event_id
      and public.is_org_member(events.organization_id, 'editor')
  ));

-- Session-Speaker junction
create table public.session_speakers (
  session_id uuid not null references public.sessions(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  primary key (session_id, speaker_id)
);

alter table public.session_speakers enable row level security;

create policy "Session speakers follow session visibility"
  on public.session_speakers for select
  using (exists (
    select 1 from public.sessions s
    join public.events e on e.id = s.event_id
    where s.id = session_speakers.session_id
      and (e.status = 'published' or public.is_org_member(e.organization_id))
  ));

create policy "Editors can manage session speakers"
  on public.session_speakers for all
  using (exists (
    select 1 from public.sessions s
    join public.events e on e.id = s.event_id
    where s.id = session_speakers.session_id
      and public.is_org_member(e.organization_id, 'editor')
  ));
