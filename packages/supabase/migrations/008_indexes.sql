-- Performance indexes

-- Events
create index idx_events_org on public.events(organization_id);
create index idx_events_status on public.events(status);
create index idx_events_slug on public.events(organization_id, slug);
create index idx_events_dates on public.events(start_date, end_date);

-- Sessions
create index idx_sessions_event on public.sessions(event_id);
create index idx_sessions_track on public.sessions(track_id);
create index idx_sessions_time on public.sessions(event_id, start_time);

-- Speakers
create index idx_speakers_event on public.speakers(event_id);

-- Registrations
create index idx_registrations_event on public.registrations(event_id);
create index idx_registrations_user on public.registrations(user_id);
create index idx_registrations_email on public.registrations(email);
create index idx_registrations_qr on public.registrations(qr_code);
create index idx_registrations_status on public.registrations(event_id, status);

-- Posts
create index idx_posts_event on public.posts(event_id, created_at desc);
create index idx_posts_author on public.posts(author_id);

-- Comments
create index idx_comments_post on public.comments(post_id, created_at);

-- Messages
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_messages_sender on public.messages(sender_id);

-- Connections
create index idx_connections_requester on public.connections(requester_id);
create index idx_connections_receiver on public.connections(receiver_id);
create index idx_connections_event on public.connections(event_id);

-- Conversation members
create index idx_conv_members_user on public.conversation_members(user_id);
create index idx_conv_members_conv on public.conversation_members(conversation_id);

-- Organization members
create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);
