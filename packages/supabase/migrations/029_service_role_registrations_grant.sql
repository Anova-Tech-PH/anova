-- Allow service_role to SELECT and UPDATE registrations.
-- Needed for createAttendeeAccount to link registrations (user_id IS NULL)
-- to newly created auth accounts.
GRANT SELECT, UPDATE ON public.registrations TO service_role;
