-- Posts (activity feed)
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'text' check (type in ('text', 'photo', 'poll', 'announcement')),
  content text not null,
  image_url text,
  poll_options jsonb,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Attendees can view event posts"
  on public.posts for select
  using (public.is_event_attendee(event_id) or exists (
    select 1 from public.events
    where events.id = posts.event_id
      and public.is_org_member(events.organization_id)
  ));

create policy "Attendees can create posts"
  on public.posts for insert
  with check (
    author_id = auth.uid()
    and public.is_event_attendee(event_id)
  );

create policy "Authors can update own posts"
  on public.posts for update
  using (author_id = auth.uid());

create policy "Authors can delete own posts"
  on public.posts for delete
  using (author_id = auth.uid());

-- Post likes
create table public.post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_likes enable row level security;

create policy "Attendees can manage likes"
  on public.post_likes for all
  using (user_id = auth.uid());

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  likes_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Comments follow post visibility"
  on public.comments for select
  using (exists (
    select 1 from public.posts
    where posts.id = comments.post_id
      and (public.is_event_attendee(posts.event_id) or exists (
        select 1 from public.events
        where events.id = posts.event_id
          and public.is_org_member(events.organization_id)
      ))
  ));

create policy "Attendees can create comments"
  on public.comments for insert
  with check (author_id = auth.uid());

create policy "Authors can update own comments"
  on public.comments for update
  using (author_id = auth.uid());

create policy "Authors can delete own comments"
  on public.comments for delete
  using (author_id = auth.uid());

-- Comment likes
create table public.comment_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

alter table public.comment_likes enable row level security;

create policy "Users can manage comment likes"
  on public.comment_likes for all
  using (user_id = auth.uid());

-- Poll votes
create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.poll_votes enable row level security;

create policy "Users can manage own poll votes"
  on public.poll_votes for all
  using (user_id = auth.uid());

-- Connections
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, receiver_id, event_id)
);

alter table public.connections enable row level security;

create policy "Users can view own connections"
  on public.connections for select
  using (requester_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can create connection requests"
  on public.connections for insert
  with check (requester_id = auth.uid());

create policy "Receivers can update connection status"
  on public.connections for update
  using (receiver_id = auth.uid());

-- Update post counts via triggers
create or replace function public.update_post_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes_count = likes_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_like_change
  after insert or delete on public.post_likes
  for each row execute function public.update_post_likes_count();

create or replace function public.update_post_comments_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comments_count = comments_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_post_comments_count();
