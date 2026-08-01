import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import {
  getTeamMembers,
  getCurrentUserRole,
} from "@/features/team/queries";
import { TeamManager } from "@/features/team/components/team-manager";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get the user's organization
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const orgId = membership.organization_id;
  const [members, currentRole] = await Promise.all([
    getTeamMembers(orgId),
    getCurrentUserRole(orgId),
  ]);

  if (!currentRole) redirect("/dashboard");

  return (
    <TeamManager
      members={members}
      orgId={orgId}
      currentUserId={user.id}
      currentUserRole={currentRole}
    />
  );
}
