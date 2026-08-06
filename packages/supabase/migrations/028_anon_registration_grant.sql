-- Allow anonymous users to register for events.
-- RLS policy "Anyone can register for events" already permits this;
-- this grant lets the anon role reach the table.
grant insert on public.registrations to anon;
