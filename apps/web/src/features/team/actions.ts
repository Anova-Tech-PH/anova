"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_ROLES = ["admin", "editor", "check_in", "viewer"] as const;

export async function inviteTeamMember(
  orgId: string,
  email: string,
  role: string
) {
  const supabase = await createClient();

  // Verify current user is admin or owner
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: currentMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (
    !currentMember ||
    (currentMember.role !== "owner" && currentMember.role !== "admin")
  ) {
    throw new Error("Only owners and admins can invite members");
  }

  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    throw new Error("Invalid role");
  }

  // Look up the user by email in profiles
  // Since profiles don't store email, we need another approach.
  // We'll look up the user via a Supabase admin RPC or use the
  // auth admin API. Since we can't access auth.users from the client,
  // let's use a direct query approach.

  // First, try to find the user by searching auth metadata through
  // a database function, or we can use the user's email from auth.
  // The simplest approach: use supabase auth admin listUsers (not available
  // from client). Instead, we'll create an RPC or use a workaround.

  // Workaround: Query profiles and match against auth user.
  // Since we can't query auth.users from client, let's try to
  // look up by email using the auth signInWithOtp to check if user exists.
  // Actually the cleanest approach is to use the service role client,
  // but we only have the user's client here.

  // For this implementation, we'll look up the email by querying
  // the auth.users table through a SECURITY DEFINER function.
  // But we haven't created one yet. Let's use a simpler approach:
  // try to find a profile where the user has matching email by
  // checking if any user with that email exists.

  // Simple approach: use supabase.rpc or just try the invite.
  // We'll use a practical workaround - search for users through
  // the profiles table. Since profiles don't have email, we'll
  // need the admin client.

  // Let's use the Supabase admin client approach via service role
  // Actually in a server action we can create an admin client.
  // But the @attendly/ui/supabase/server createClient uses user cookies.

  // Practical approach: Query the database directly for the user.
  // We'll do this by querying auth.users via a database function.
  const { data: lookupResult, error: lookupError } = await supabase.rpc(
    "lookup_user_by_email",
    { _email: email.toLowerCase().trim() }
  ).maybeSingle();

  if (lookupError) {
    // If the RPC doesn't exist, we need to create it.
    // Fall back to a simpler approach.
    throw new Error(
      "User not found — they need to sign up first. (Email lookup not available)"
    );
  }

  if (!lookupResult) {
    throw new Error("User not found — they need to sign up first");
  }

  const targetUserId = (lookupResult as { id: string }).id;

  // Check if user is already a member
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existing) {
    throw new Error("This user is already a member of the organization");
  }

  // Add the member
  const { error: insertError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: orgId,
      user_id: targetUserId,
      role,
    });

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/settings/team");
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: string
) {
  const supabase = await createClient();

  // Verify current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: currentMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (
    !currentMember ||
    (currentMember.role !== "owner" && currentMember.role !== "admin")
  ) {
    throw new Error("Only owners and admins can change roles");
  }

  // Check that target is not the owner
  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (!targetMember) throw new Error("Member not found");
  if (targetMember.role === "owner") {
    throw new Error("Cannot change the owner's role");
  }

  if (!VALID_ROLES.includes(newRole as (typeof VALID_ROLES)[number])) {
    throw new Error("Invalid role");
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/team");
}

export async function removeMember(orgId: string, memberId: string) {
  const supabase = await createClient();

  // Verify current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: currentMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (
    !currentMember ||
    (currentMember.role !== "owner" && currentMember.role !== "admin")
  ) {
    throw new Error("Only owners and admins can remove members");
  }

  // Check that target is not the owner
  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (!targetMember) throw new Error("Member not found");
  if (targetMember.role === "owner") {
    throw new Error("Cannot remove the owner");
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) throw new Error(error.message);

  revalidatePath("/settings/team");
}
