-- Fix: Remove overly permissive SELECT/UPDATE grants on quote_requests
-- Admin access should be via service_role only

revoke select, update on public.quote_requests from authenticated;

drop policy if exists "Authenticated users can view quote requests" on public.quote_requests;
drop policy if exists "Authenticated users can update quote requests" on public.quote_requests;
