import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import {
  getTeamMembers,
  getCurrentUserRole,
} from "@/features/team/queries";
import { TeamManager } from "@/features/team/components/team-manager";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  const orgId = org.id;
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
