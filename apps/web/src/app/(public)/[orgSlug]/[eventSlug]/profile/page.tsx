import { createClient } from "@attendly/ui/supabase/server";
import { AuthGuard } from "../auth-guard";
import { getMyProfile } from "@/features/attendee-profile/queries";
import { getEventInterests } from "@/features/matchmaking/queries";
import { ProfileEditor } from "@/features/attendee-profile/components/profile-editor";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Get event ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Event not found</h2>
      </div>
    );
  }

  const currentPath = `/${orgSlug}/${eventSlug}/profile`;

  return (
    <AuthGuard currentPath={currentPath}>
      <ProfilePageContent eventId={event.id} />
    </AuthGuard>
  );
}

async function ProfilePageContent({ eventId }: { eventId: string }) {
  const supabase = await createClient();

  const [profile, interestsData] = await Promise.all([
    getMyProfile(eventId),
    getEventInterests(eventId),
  ]);

  // Get user's selected interest IDs
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let selectedInterestIds: string[] = [];
  if (user) {
    const { data: myInterests } = await supabase
      .from("attendee_interests")
      .select("interest_id")
      .eq("user_id", user.id);

    selectedInterestIds = (myInterests ?? []).map((i) => i.interest_id);
  }

  return (
    <ProfileEditor
      profile={profile}
      eventId={eventId}
      interests={interestsData.interests.map((i) => ({
        id: i.id,
        name: i.name,
      }))}
      selectedInterestIds={selectedInterestIds}
    />
  );
}
