-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  is_group boolean not null default false,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Attendees can create conversations"
  on public.conversations for insert
  with check (public.is_event_attendee(event_id));

-- Conversation members
create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  is_muted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

alter table public.conversation_members enable row level security;

create policy "Members can view conversation members"
  on public.conversation_members for select
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
  ));

create policy "Users can manage their own membership"
  on public.conversation_members for update
  using (user_id = auth.uid());

-- Users can add themselves or existing members can add others
create policy "Conversation creators can add members"
  on public.conversation_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
  );

-- Now that conversation_members exists, add the select policy on conversations
create policy "Members can view their conversations"
  on public.conversations for select
  using (exists (
    select 1 from public.conversation_members
    where conversation_members.conversation_id = conversations.id
      and conversation_members.user_id = auth.uid()
  ));

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Conversation members can view messages"
  on public.messages for select
  using (exists (
    select 1 from public.conversation_members
    where conversation_members.conversation_id = messages.conversation_id
      and conversation_members.user_id = auth.uid()
  ));

create policy "Conversation members can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members
      where conversation_members.conversation_id = messages.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );

-- Enable realtime for messages and posts
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.comments;
