-- Allow anonymous users to validate speaker form tokens (public form)
create policy "Anyone can validate speaker form tokens"
  on public.speaker_form_tokens for select
  to anon
  using (expires_at > now());

-- Allow anonymous users to update speakers via valid form tokens
-- Scoped: only speakers with an active token can be updated
create policy "Speakers can update own profile via form token"
  on public.speakers for update
  to anon
  using (exists (
    select 1 from public.speaker_form_tokens t
    where t.speaker_id = speakers.id
      and t.expires_at > now()
  ));

-- Grant update on speakers to anon (RLS still enforces row-level access)
grant update on public.speakers to anon;
