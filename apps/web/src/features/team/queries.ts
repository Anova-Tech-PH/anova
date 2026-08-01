import { createClient } from "@attendly/ui/supabase/server";

export type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at, profiles(full_name, avatar_url)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // We need to get emails from auth — but since we can't access auth.users
  // from the client, we'll look up profiles and use the user_id.
  // For email, we query each user's profile. Since profiles don't store email,
  // we'll use the supabase admin or just show the name.
  // Actually, let's get the current user's info and use a service role approach.
  // For simplicity, we'll get emails through auth.getUser for the current user
  // and show user_id for others (or use a lookup).

  // Get all user IDs to look up emails
  const userIds = data?.map((m) => m.user_id) ?? [];

  // Use profiles table — email isn't stored there, so we'll use an RPC or
  // just display the name. For a real app, you'd store email in profiles
  // or use a service role client. For now, we'll get the current user's email
  // and leave others blank.
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  return (data ?? []).map((member) => {
    const profile = member.profiles as unknown as {
      full_name: string;
      avatar_url: string | null;
    } | null;

    return {
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      email:
        currentUser && member.user_id === currentUser.id
          ? currentUser.email ?? ""
          : "",
      name: profile?.full_name || "Team Member",
      avatar_url: profile?.avatar_url ?? null,
      created_at: member.created_at,
    };
  });
}

export async function getCurrentUserOrgId(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return data?.organization_id ?? null;
}

export async function getCurrentUserRole(orgId: string): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  return data?.role ?? null;
}
