-- Grant table-level permissions to anon and authenticated roles.
-- RLS policies handle fine-grained access; these grants allow the roles
-- to reach the tables so that RLS can be evaluated.

grant select on public.organizations to anon, authenticated;
grant insert, update on public.organizations to authenticated;

grant select, insert, update, delete on public.organization_members to authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

grant select on public.tracks to anon, authenticated;
grant insert, update, delete on public.tracks to authenticated;

grant select on public.speakers to anon, authenticated;
grant insert, update, delete on public.speakers to authenticated;

grant select on public.sessions to anon, authenticated;
grant insert, update, delete on public.sessions to authenticated;

grant select on public.session_speakers to anon, authenticated;
grant insert, update, delete on public.session_speakers to authenticated;

grant select on public.ticket_types to anon, authenticated;
grant insert, update, delete on public.ticket_types to authenticated;

grant select on public.registrations to anon, authenticated;
grant insert, update on public.registrations to authenticated;

grant select on public.session_bookmarks to authenticated;
grant insert, delete on public.session_bookmarks to authenticated;

grant select on public.posts to authenticated;
grant insert, update, delete on public.posts to authenticated;

grant select on public.post_likes to authenticated;
grant insert, delete on public.post_likes to authenticated;

grant select on public.comments to authenticated;
grant insert, update, delete on public.comments to authenticated;

grant select on public.comment_likes to authenticated;
grant insert, delete on public.comment_likes to authenticated;

grant select on public.poll_votes to authenticated;
grant insert on public.poll_votes to authenticated;

grant select on public.connections to authenticated;
grant insert, update, delete on public.connections to authenticated;

grant select on public.conversations to authenticated;
grant insert on public.conversations to authenticated;

grant select on public.conversation_members to authenticated;
grant insert, update on public.conversation_members to authenticated;

grant select on public.messages to authenticated;
grant insert on public.messages to authenticated;

grant select on public.breakout_rooms to anon, authenticated;
grant insert, update, delete on public.breakout_rooms to authenticated;

grant select on public.breakout_room_participants to anon, authenticated;
grant insert, delete on public.breakout_room_participants to authenticated;
