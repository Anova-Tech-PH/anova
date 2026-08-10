import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { CertificateDownload } from "@/features/certificates/components/certificate-download";

export default async function PublicCertificatePage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, start_date, end_date")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .single();
  if (!event) notFound();

  // Check if certificates are enabled
  const { data: config } = await supabase
    .from("certificate_configs")
    .select("id, enabled, min_check_ins")
    .eq("event_id", event.id)
    .single();

  if (!config || !config.enabled) notFound();

  // Get current user's registration and check-in count
  const { data: { user } } = await supabase.auth.getUser();

  let registration = null;
  let checkInCount = 0;

  if (user) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, name, email")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "checked_in"])
      .single();

    if (reg) {
      registration = reg;

      const { count } = await supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("registration_id", reg.id)
        .eq("event_id", event.id);

      checkInCount = count ?? 0;
    }
  }

  const isEligible = registration && checkInCount >= config.min_check_ins;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Certificate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download your attendance certificate for {event.title}.
        </p>
      </div>

      <CertificateDownload
        eligible={!!isEligible}
        loggedIn={!!user}
        registered={!!registration}
        checkInCount={checkInCount}
        minCheckIns={config.min_check_ins}
        attendeeName={registration?.name ?? ""}
        eventTitle={event.title}
        orgName={org.name}
        startDate={event.start_date}
        endDate={event.end_date}
      />
    </div>
  );
}
