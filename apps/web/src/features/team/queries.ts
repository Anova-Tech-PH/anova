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

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!members?.length) return [];

  // Fetch profiles separately (no direct FK between organization_members and profiles)
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Get current user's email (profiles don't store email)
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  return members.map((member) => {
    const profile = profileMap.get(member.user_id);

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
