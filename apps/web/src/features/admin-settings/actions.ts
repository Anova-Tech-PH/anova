"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function setInvitationCode(
  eventId: string,
  code: string | null,
  required: boolean
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("events")
    .update({
      invitation_code: code,
      invitation_code_required: required,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function addEventAdmin(
  eventId: string,
  email: string,
  role: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Try to find the user by email
  const { data: lookupResult } = await supabase
    .rpc("lookup_user_by_email", {
      _email: email.toLowerCase().trim(),
    })
    .maybeSingle();

  const userId = lookupResult ? (lookupResult as { id: string }).id : null;

  const { error } = await supabase.from("event_admins").insert({
    event_id: eventId,
    email: email.toLowerCase().trim(),
    user_id: userId,
    role,
    added_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function updateEventAdminRole(
  adminId: string,
  eventId: string,
  newRole: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_admins")
    .update({ role: newRole })
    .eq("id", adminId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function removeEventAdmin(adminId: string, eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_admins")
    .delete()
    .eq("id", adminId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function shareTemplate(
  eventId: string,
  shareWith: { email?: string; orgId?: string }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!shareWith.email && !shareWith.orgId) {
    throw new Error("Must provide either email or organization to share with");
  }

  const { error } = await supabase.from("shared_templates").insert({
    source_event_id: eventId,
    shared_by: user.id,
    shared_with_email: shareWith.email?.toLowerCase().trim() ?? null,
    shared_with_org_id: shareWith.orgId ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function updateSharedTemplateStatus(
  templateId: string,
  status: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("shared_templates")
    .update({ status })
    .eq("id", templateId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function requestTemplate(
  requestingEventId: string,
  targetEventId: string,
  message?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("template_requests").insert({
    requesting_event_id: requestingEventId,
    requested_by: user.id,
    target_event_id: targetEventId,
    message: message ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${requestingEventId}/admin-settings`);
}

export async function updateTemplateRequestStatus(
  requestId: string,
  eventId: string,
  status: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("template_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function searchOrganizations(query: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function searchEvents(query: string, excludeEventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .ilike("title", `%${query}%`)
    .neq("id", excludeEventId)
    .limit(10);

  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({ id: e.id, name: e.title }));
}
