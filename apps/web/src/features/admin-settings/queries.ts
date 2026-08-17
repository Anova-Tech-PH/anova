import { createClient } from "@attendly/ui/supabase/server";

export type EventAdmin = {
  id: string;
  event_id: string;
  email: string;
  user_id: string | null;
  role: string;
  added_by: string;
  added_by_name: string | null;
  display_name: string | null;
  created_at: string;
};

export type SharedTemplate = {
  id: string;
  source_event_id: string;
  shared_by: string;
  shared_with_email: string | null;
  shared_with_org_id: string | null;
  status: string;
  created_at: string;
};

export type TemplateRequest = {
  id: string;
  requesting_event_id: string;
  requested_by: string;
  target_event_id: string;
  message: string | null;
  status: string;
  created_at: string;
  direction: "incoming" | "outgoing";
  event_name: string | null;
  requester_name: string | null;
};

export type OrgAdmin = {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  organization_id: string;
};

export async function getInvitationCode(
  eventId: string
): Promise<{ code: string | null; required: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("invitation_code, invitation_code_required")
    .eq("id", eventId)
    .single();

  if (error) throw new Error(error.message);

  return {
    code: data.invitation_code ?? null,
    required: data.invitation_code_required ?? false,
  };
}

export async function getEventAdmins(eventId: string): Promise<EventAdmin[]> {
  const supabase = await createClient();

  const { data: admins, error } = await supabase
    .from("event_admins")
    .select("id, event_id, email, user_id, role, added_by, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!admins?.length) return [];

  // Collect all user_ids and added_by ids for profile lookup
  const userIds = [
    ...new Set([
      ...admins.map((a) => a.user_id).filter(Boolean),
      ...admins.map((a) => a.added_by),
    ]),
  ] as string[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  return admins.map((admin) => ({
    id: admin.id,
    event_id: admin.event_id,
    email: admin.email,
    user_id: admin.user_id,
    role: admin.role,
    added_by: admin.added_by,
    added_by_name: profileMap.get(admin.added_by) ?? null,
    display_name: admin.user_id
      ? profileMap.get(admin.user_id) ?? null
      : null,
    created_at: admin.created_at,
  }));
}

export async function getOrgAdminsForEvent(
  eventId: string
): Promise<OrgAdmin[]> {
  const supabase = await createClient();

  // Get org_id from event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  if (eventError) throw new Error(eventError.message);
  if (!event?.organization_id) return [];

  const orgId = event.organization_id;

  // Fetch org members with role owner or admin
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("organization_id", orgId)
    .in("role", ["owner", "admin"])
    .order("created_at", { ascending: true });

  if (membersError) throw new Error(membersError.message);
  if (!members?.length) return [];

  // Fetch profiles for display_name
  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  return members.map((member) => ({
    id: member.id,
    user_id: member.user_id,
    role: member.role,
    display_name: profileMap.get(member.user_id) ?? null,
    organization_id: orgId,
  }));
}

export async function getSharedTemplates(
  eventId: string
): Promise<SharedTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_templates")
    .select(
      "id, source_event_id, shared_by, shared_with_email, shared_with_org_id, status, created_at"
    )
    .eq("source_event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function getTemplateRequests(
  eventId: string
): Promise<TemplateRequest[]> {
  const supabase = await createClient();

  // Fetch incoming requests (this event is the target)
  const { data: incoming, error: inError } = await supabase
    .from("template_requests")
    .select(
      "id, requesting_event_id, requested_by, target_event_id, message, status, created_at"
    )
    .eq("target_event_id", eventId)
    .order("created_at", { ascending: false });

  if (inError) throw new Error(inError.message);

  // Fetch outgoing requests (this event is requesting)
  const { data: outgoing, error: outError } = await supabase
    .from("template_requests")
    .select(
      "id, requesting_event_id, requested_by, target_event_id, message, status, created_at"
    )
    .eq("requesting_event_id", eventId)
    .order("created_at", { ascending: false });

  if (outError) throw new Error(outError.message);

  // Collect all event IDs and user IDs for lookups
  const allRequests = [...(incoming ?? []), ...(outgoing ?? [])];
  if (!allRequests.length) return [];

  const eventIds = [
    ...new Set([
      ...allRequests.map((r) => r.requesting_event_id),
      ...allRequests.map((r) => r.target_event_id),
    ]),
  ];
  const userIds = [...new Set(allRequests.map((r) => r.requested_by))];

  // Fetch event names
  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .in("id", eventIds);

  const eventMap = new Map((events ?? []).map((e) => [e.id, e.title]));

  // Fetch requester profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  const incomingResults: TemplateRequest[] = (incoming ?? []).map((r) => ({
    id: r.id,
    requesting_event_id: r.requesting_event_id,
    requested_by: r.requested_by,
    target_event_id: r.target_event_id,
    message: r.message,
    status: r.status,
    created_at: r.created_at,
    direction: "incoming" as const,
    event_name: eventMap.get(r.requesting_event_id) ?? null,
    requester_name: profileMap.get(r.requested_by) ?? null,
  }));

  const outgoingResults: TemplateRequest[] = (outgoing ?? []).map((r) => ({
    id: r.id,
    requesting_event_id: r.requesting_event_id,
    requested_by: r.requested_by,
    target_event_id: r.target_event_id,
    message: r.message,
    status: r.status,
    created_at: r.created_at,
    direction: "outgoing" as const,
    event_name: eventMap.get(r.target_event_id) ?? null,
    requester_name: profileMap.get(r.requested_by) ?? null,
  }));

  return [...incomingResults, ...outgoingResults];
}
