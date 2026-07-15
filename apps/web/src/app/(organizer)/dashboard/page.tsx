import { redirect } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getDashboardStats } from "@/features/dashboard/queries";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await getDashboardStats(user.id);

  return (
    <DashboardContent
      userName={user.user_metadata?.full_name}
      stats={stats}
    />
  );
}
