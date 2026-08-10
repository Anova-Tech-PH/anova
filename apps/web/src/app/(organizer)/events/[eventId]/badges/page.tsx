import { createClient } from "@attendly/ui/supabase/server";
import { BadgeConfigurator } from "@/features/badges/components/badge-configurator";
import { getCustomFieldDefinitions } from "@/features/registration/queries";

export default async function BadgesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, email, status, qr_code, custom_fields, ticket_type_id, user_id, ticket_types(name)")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .order("name");

  const userIds = (registrations ?? [])
    .map((r) => r.user_id)
    .filter((id): id is string => id !== null);

  let profiles: Record<string, { company: string | null; job_title: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, company, job_title")
      .in("id", userIds);

    for (const p of profileData ?? []) {
      profiles[p.id] = { company: p.company, job_title: p.job_title };
    }
  }

  const enriched = (registrations ?? []).map((r) => ({
    ...r,
    profile: r.user_id ? profiles[r.user_id] ?? null : null,
  }));

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  const customFields = await getCustomFieldDefinitions(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Name Badges</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate printable PDF badges with QR codes for attendee check-in.
        </p>
      </div>
      <BadgeConfigurator
        registrations={enriched}
        ticketTypes={ticketTypes ?? []}
        customFields={customFields}
        eventTitle={event?.title ?? "Event"}
      />
    </div>
  );
}
