import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getPublicVolunteerInfo } from "@/features/volunteers/queries";
import { PublicVolunteerForm } from "@/features/volunteers/components/public-volunteer-form";

export default async function PublicVolunteerPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Resolve event from slugs
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("slug", eventSlug)
    .eq("organization_id", org.id)
    .single();

  if (!event) notFound();

  const volunteerInfo = await getPublicVolunteerInfo(event.id);
  if (!volunteerInfo) notFound();

  // Get current user info for pre-fill
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userEmail: string | undefined;
  let userName: string | undefined;

  if (user) {
    userEmail = user.email;
    const { data: profile } = await supabase
      .from("registrations")
      .select("name")
      .eq("email", user.email ?? "")
      .limit(1)
      .single();
    userName = profile?.name ?? user.user_metadata?.name;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PublicVolunteerForm
        eventId={event.id}
        title={volunteerInfo.settings.title}
        instructions={volunteerInfo.settings.instructions}
        bannerImageUrl={volunteerInfo.settings.banner_image_url}
        applicationDeadline={volunteerInfo.settings.application_deadline}
        roles={volunteerInfo.roles}
        questions={volunteerInfo.questions}
        eventDates={volunteerInfo.eventDates}
        eventTitle={event.title}
        userEmail={userEmail}
        userName={userName}
      />
    </div>
  );
}
