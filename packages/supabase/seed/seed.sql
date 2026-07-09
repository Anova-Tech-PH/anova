-- Seed data for local development
-- Note: Auth users must be created via Supabase Auth API, not direct SQL inserts.
-- After starting Supabase locally, create test users via the dashboard or API.

-- This file provides sample data that can be inserted after creating test users.
-- Replace the UUIDs below with actual user IDs from auth.users.

-- Example seed (uncomment and update UUIDs after creating users):
/*
-- Create an organization
insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Demo Events Co', 'demo-events');

-- Add owner
insert into public.organization_members (organization_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', '<USER_ID>', 'owner');

-- Create a sample event
insert into public.events (id, organization_id, title, slug, description, start_date, end_date, status)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Tech Conference 2026',
  'tech-conference-2026',
  'A modern tech conference for developers and designers.',
  '2026-09-15 09:00:00+00',
  '2026-09-17 18:00:00+00',
  'published'
);

-- Create ticket types
insert into public.ticket_types (event_id, name, type, price, quantity)
values
  ('00000000-0000-0000-0000-000000000010', 'General Admission', 'free', 0, 500),
  ('00000000-0000-0000-0000-000000000010', 'VIP Pass', 'paid', 99.00, 50);
*/
