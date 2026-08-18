import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is an organizer
  const { count } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  redirect(count && count > 0 ? "/dashboard" : "/my-events");
}
