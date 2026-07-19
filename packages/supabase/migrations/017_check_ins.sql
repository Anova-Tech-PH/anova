-- Add enable_check_in toggle to sessions
alter table public.sessions add column enable_check_in boolean not null default false;

-- Create check_ins table for granular attendance tracking
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One check-in per registration per session
create unique index check_ins_reg_session_unique on public.check_ins (registration_id, session_id);

-- Performance indexes
create index check_ins_event_id_idx on public.check_ins (event_id);
create index check_ins_session_id_idx on public.check_ins (session_id);
create index check_ins_registration_id_idx on public.check_ins (registration_id);

-- RLS
alter table public.check_ins enable row level security;

create policy "Org members can view check-ins" on public.check_ins for select
  using (exists (
    select 1 from public.events
    where events.id = check_ins.event_id
      and public.is_org_member(events.organization_id)
  ));

create policy "Org members can insert check-ins" on public.check_ins for insert
  with check (exists (
    select 1 from public.events
    where events.id = check_ins.event_id
      and public.is_org_member(events.organization_id)
  ));

create policy "Attendees can view own check-ins" on public.check_ins for select
  using (exists (
    select 1 from public.registrations
    where registrations.id = check_ins.registration_id
      and registrations.user_id = auth.uid()
  ));

grant select, insert on public.check_ins to authenticated;
