-- Speaker form settings (one per event)
create table public.speaker_form_settings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email_subject text not null default '{{speaker_name}}, please submit your speaker info for {{event_name}}',
  email_body text not null default 'Hi {{speaker_name}},

We''d love to have your updated bio, photo, and session details for {{event_name}}.

Please complete your speaker profile using the link below:

{{form_link}}

Thank you!',
  notification_preference text not null default 'every_update'
    check (notification_preference in ('every_update', 'daily_summary')),
  send_reminder_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id)
);

alter table public.speaker_form_settings enable row level security;

create policy "Org members can view speaker form settings"
  on public.speaker_form_settings for select
  using (exists (
    select 1 from public.events e
    where e.id = speaker_form_settings.event_id
      and public.is_org_member(e.organization_id)
  ));

create policy "Editors can manage speaker form settings"
  on public.speaker_form_settings for all
  using (exists (
    select 1 from public.events e
    where e.id = speaker_form_settings.event_id
      and public.is_org_member(e.organization_id, 'editor')
  ));

grant select on public.speaker_form_settings to authenticated;
grant all on public.speaker_form_settings to authenticated;

-- Speaker form fields (which fields to collect)
create table public.speaker_form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  field_key text not null,
  label text not null,
  included boolean not null default true,
  required boolean not null default false,
  is_custom boolean not null default false,
  field_type text not null default 'text'
    check (field_type in ('text', 'textarea', 'url', 'image')),
  sort_order int not null default 0,
  organizer_only boolean not null default false,
  unique(event_id, field_key)
);

alter table public.speaker_form_fields enable row level security;

create policy "Org members can view speaker form fields"
  on public.speaker_form_fields for select
  using (exists (
    select 1 from public.events e
    where e.id = speaker_form_fields.event_id
      and public.is_org_member(e.organization_id)
  ));

create policy "Editors can manage speaker form fields"
  on public.speaker_form_fields for all
  using (exists (
    select 1 from public.events e
    where e.id = speaker_form_fields.event_id
      and public.is_org_member(e.organization_id, 'editor')
  ));

create policy "Anyone can read speaker form fields for published events"
  on public.speaker_form_fields for select
  using (exists (
    select 1 from public.events e
    where e.id = speaker_form_fields.event_id
      and e.status = 'published'
  ));

grant select on public.speaker_form_fields to anon, authenticated;
grant all on public.speaker_form_fields to authenticated;

-- Speaker form tokens (for public form authentication)
create table public.speaker_form_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.speaker_form_tokens enable row level security;

create policy "Org members can manage speaker form tokens"
  on public.speaker_form_tokens for all
  using (exists (
    select 1 from public.events e
    where e.id = speaker_form_tokens.event_id
      and public.is_org_member(e.organization_id, 'editor')
  ));

grant select on public.speaker_form_tokens to anon, authenticated;
grant all on public.speaker_form_tokens to authenticated;

-- Indexes
create index idx_speaker_form_fields_event on public.speaker_form_fields(event_id);
create index idx_speaker_form_tokens_token on public.speaker_form_tokens(token);
create index idx_speaker_form_tokens_speaker on public.speaker_form_tokens(speaker_id);
