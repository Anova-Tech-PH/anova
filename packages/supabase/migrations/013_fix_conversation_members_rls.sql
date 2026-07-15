-- Fix infinite recursion in conversation_members SELECT policy.
-- The old policy referenced conversation_members in its own subquery.
-- Solution: use a SECURITY DEFINER function to check membership without RLS.

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  );
$$;

-- Drop the recursive policy
drop policy "Members can view conversation members" on public.conversation_members;

-- New non-recursive policy using the SECURITY DEFINER function
create policy "Members can view conversation members"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id));

-- Also fix the INSERT policy which has the same self-reference issue
drop policy "Conversation creators can add members" on public.conversation_members;

create policy "Conversation creators can add members"
  on public.conversation_members for insert
  with check (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id)
  );
