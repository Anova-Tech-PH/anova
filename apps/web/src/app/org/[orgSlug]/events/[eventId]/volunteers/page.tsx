import { createClient } from "@attendly/ui/supabase/server";
import {
  getVolunteerSettings,
  getVolunteerRoles,
  getVolunteerQuestions,
  getApplications,
  getInvitations,
  getVolunteerBreakdown,
} from "@/features/volunteers/queries";
import { VolunteerPageClient } from "@/features/volunteers/components/volunteer-page-client";

export default async function VolunteerManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  // Fetch all data in parallel
  const [settings, roles, questions, applicationsResult, invitations, breakdown, eventResult] =
    await Promise.all([
      getVolunteerSettings(eventId),
      getVolunteerRoles(eventId),
      getVolunteerQuestions(eventId),
      getApplications(eventId),
      getInvitations(eventId),
      getVolunteerBreakdown(eventId),
      supabase
        .from("events")
        .select("slug, organization:organizations(slug)")
        .eq("id", eventId)
        .single(),
    ]);

  const orgSlug = (eventResult.data?.organization as unknown as { slug: string })?.slug;
  const eventSlug = eventResult.data?.slug;
  const applicationUrl =
    orgSlug && eventSlug
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${orgSlug}/${eventSlug}/volunteer`
      : null;

  return (
    <VolunteerPageClient
      eventId={eventId}
      settings={settings}
      roles={roles}
      questions={questions}
      applications={applicationsResult.applications}
      totalApplications={applicationsResult.total}
      invitations={invitations}
      breakdown={breakdown}
      applicationUrl={applicationUrl}
    />
  );
}
