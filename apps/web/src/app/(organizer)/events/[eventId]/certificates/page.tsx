import { createClient } from "@attendly/ui/supabase/server";
import { CertificateConfig } from "@/features/certificates/components/certificate-config";
import { EligibleAttendees } from "@/features/certificates/components/eligible-attendees";
import { getEligibleAttendees } from "@/features/certificates/queries";

export default async function CertificatesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, end_date, organization_id")
    .eq("id", eventId)
    .single();

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", event?.organization_id)
    .single();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time");

  const { config, eligible, issued } = await getEligibleAttendees(eventId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Certificates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set eligibility criteria and generate attendance certificates for
          qualified attendees.
        </p>
      </div>

      <CertificateConfig
        eventId={eventId}
        sessions={sessions ?? []}
        initial={config}
      />

      <EligibleAttendees
        eventId={eventId}
        eligible={eligible}
        issued={issued}
        eventTitle={event?.title ?? ""}
        orgName={org?.name ?? ""}
        startDate={event?.start_date ?? ""}
        endDate={event?.end_date ?? ""}
        configId={config?.id ?? null}
      />
    </div>
  );
}
