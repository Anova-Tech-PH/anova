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
