-- Add join_code column to events
alter table public.events
  add column join_code text unique;

-- Generate join codes for existing events (6-char uppercase alphanumeric)
update public.events
  set join_code = upper(substr(md5(random()::text), 1, 6))
  where join_code is null;

-- Make it not null after backfilling
alter table public.events
  alter column join_code set not null;

-- Add default for new events
alter table public.events
  alter column join_code set default upper(substr(md5(random()::text), 1, 6));

-- Index for fast lookup
create index idx_events_join_code on public.events(join_code);
