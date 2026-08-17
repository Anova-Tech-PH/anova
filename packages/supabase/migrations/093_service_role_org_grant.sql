-- Grant service_role access to tables used in Stripe payment flows
GRANT SELECT, UPDATE ON public.organizations TO service_role;
GRANT SELECT, UPDATE ON public.events TO service_role;
GRANT ALL ON public.registrations TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.registration_intents TO service_role;
GRANT ALL ON public.promo_codes TO service_role;
GRANT SELECT ON public.ticket_types TO service_role;
