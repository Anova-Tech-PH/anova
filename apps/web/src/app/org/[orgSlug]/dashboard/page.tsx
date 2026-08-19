import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import { getDashboardStats } from "@/features/dashboard/queries";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  const stats = await getDashboardStats(org.id);

  return (
    <DashboardContent
      userName={user.user_metadata?.full_name}
      stats={stats}
      orgSlug={orgSlug}
    />
  );
}
