-- Helper function for checking org membership
create or replace function public.is_org_member(
  _org_id uuid,
  _min_role text default 'viewer'
) returns boolean as $$
declare
  _user_role text;
  _role_rank int;
  _min_rank int;
begin
  select role into _user_role
  from public.organization_members
  where organization_id = _org_id
    and user_id = auth.uid();

  if _user_role is null then
    return false;
  end if;

  _role_rank := case _user_role
    when 'owner' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'viewer' then 1
    else 0
  end;

  _min_rank := case _min_role
    when 'owner' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'viewer' then 1
    else 0
  end;

  return _role_rank >= _min_rank;
end;
$$ language plpgsql security definer stable;

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Public can view orgs (needed for public event pages to resolve org by slug)
create policy "Anyone can view organizations"
  on public.organizations for select
  using (true);

create policy "Admins can update their organizations"
  on public.organizations for update
  using (public.is_org_member(id, 'admin'));

-- Organization members
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members enable row level security;

create policy "Members can view org members"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage org members"
  on public.organization_members for all
  using (public.is_org_member(organization_id, 'admin'));

-- Allow insert for new org creation (owner adding themselves)
create policy "Users can create org memberships for themselves"
  on public.organization_members for insert
  with check (user_id = auth.uid());

-- Allow insert for new org
create policy "Anyone authenticated can create an org"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- Atomic org creation with owner membership (bypasses RLS chicken-and-egg)
create or replace function public.create_organization_with_owner(
  _name text,
  _slug text
) returns uuid as $$
declare
  _org_id uuid;
begin
  insert into public.organizations (name, slug)
  values (_name, _slug)
  returning id into _org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (_org_id, auth.uid(), 'owner');

  return _org_id;
end;
$$ language plpgsql security definer;
