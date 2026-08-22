"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { redirect } from "next/navigation";

export async function deleteOrganization(orgId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify caller is the owner
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "owner") {
    throw new Error("Only the owner can delete an organization");
  }

  // Block deletion if org has events
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (count && count > 0) {
    throw new Error(
      "Cannot delete an organization that has events. Delete all events first."
    );
  }

  // Delete the organization (cascades to members)
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (error) throw new Error(error.message);

  redirect("/onboarding");
}
