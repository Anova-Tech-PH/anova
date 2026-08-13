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
