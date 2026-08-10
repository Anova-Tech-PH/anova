import { createClient } from "@attendly/ui/supabase/server";

export async function getCertificateData(registrationId: string) {
  const supabase = await createClient();

  const { data: registration, error } = await supabase
    .from("registrations")
    .select("id, name, email, status, event_id, created_at")
    .eq("id", registrationId)
    .single();

  if (error || !registration) {
    throw new Error("Registration not found");
  }

  if (!["confirmed", "checked_in"].includes(registration.status)) {
    throw new Error("Certificate is only available for confirmed or checked-in registrations");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, organization_id")
    .eq("id", registration.event_id)
    .single();

  if (eventError || !event) {
    throw new Error("Event not found");
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", event.organization_id)
    .single();

  if (orgError || !org) {
    throw new Error("Organization not found");
  }

  return {
    registration: {
      id: registration.id,
      name: registration.name,
      email: registration.email,
      status: registration.status,
    },
    event: {
      id: event.id,
      title: event.title,
      startDate: event.start_date,
      endDate: event.end_date,
      organizationId: event.organization_id,
    },
    organization: {
      id: org.id,
      name: org.name,
    },
  };
}

export async function getCertificateConfig(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificate_configs")
    .select("*")
    .eq("event_id", eventId)
    .single();
  return data;
}

export async function getEligibleAttendees(eventId: string) {
  const supabase = await createClient();

  const { data: config } = await supabase
    .from("certificate_configs")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (!config || !config.enabled) return { config: null, eligible: [], issued: [] };

  // Get all check-ins for this event
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("registration_id, session_id")
    .eq("event_id", eventId);

  // Count check-ins per registration and track which sessions
  const regCheckIns: Record<string, { count: number; sessionIds: Set<string> }> = {};
  for (const ci of checkIns ?? []) {
    if (!regCheckIns[ci.registration_id]) {
      regCheckIns[ci.registration_id] = { count: 0, sessionIds: new Set() };
    }
    regCheckIns[ci.registration_id].count++;
    regCheckIns[ci.registration_id].sessionIds.add(ci.session_id);
  }

  // Get registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, email, status, ticket_types(name)")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .order("name");

  // Filter by eligibility criteria
  const requiredSessions = (config.required_session_ids ?? []) as string[];
  const eligible = (registrations ?? []).filter((r) => {
    const info = regCheckIns[r.id];
    if (!info) return false;
    if (info.count < config.min_check_ins) return false;
    if (requiredSessions.length > 0) {
      for (const sid of requiredSessions) {
        if (!info.sessionIds.has(sid)) return false;
      }
    }
    return true;
  });

  // Get already-issued certificates
  const { data: issued } = await supabase
    .from("certificates_issued")
    .select("registration_id, issued_at, emailed_at")
    .eq("config_id", config.id);

  return { config, eligible, issued: issued ?? [] };
}
