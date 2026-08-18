-- Quote request submissions from pricing page
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization_name text,
  event_name text not null,
  phone text,
  event_format text not null,
  event_duration text not null,
  expected_attendees text not null,
  events_per_year text not null,
  budget_range text,
  message text,
  status text not null default 'pending',
  quoted_amount numeric,
  internal_tier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_requests enable row level security;

-- Public can INSERT (submit form without auth)
grant insert on public.quote_requests to anon;

-- Only authenticated users (admins) can read/update
grant select, update on public.quote_requests to authenticated;

-- Allow anonymous inserts (form submissions)
create policy "Anyone can submit a quote request"
  on public.quote_requests for insert
  to anon, authenticated
  with check (true);

-- Only org admins can view/manage quotes (simple auth check for now)
create policy "Authenticated users can view quote requests"
  on public.quote_requests for select
  to authenticated
  using (true);

create policy "Authenticated users can update quote requests"
  on public.quote_requests for update
  to authenticated
  using (true)
  with check (true);
