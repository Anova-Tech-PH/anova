-- Grant service_role access to email tables
-- The send-email function uses a service_role client to insert email_logs
-- (bypasses RLS for cross-user email sending like registration confirmations)
GRANT ALL ON public.email_campaigns TO service_role;
GRANT ALL ON public.email_logs TO service_role;
GRANT ALL ON public.email_templates TO service_role;
GRANT ALL ON public.email_automations TO service_role;
GRANT ALL ON public.contact_lists TO service_role;
GRANT ALL ON public.contacts TO service_role;
