import { createClient } from "@attendly/ui/supabase/server";
import {
  getAttendeeProfile,
  getBookmarkedAttendeeIds,
  getAttendeeNotes,
  getAttendeeAffiliations,
  getAttendeeEducation,
} from "@/features/attendee-profile/queries";
import { AttendeeProfileView } from "@/features/attendee-profile/components/attendee-profile-view";

export default async function AttendeeProfilePage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    eventSlug: string;
    userId: string;
  }>;
}) {
  const { orgSlug, eventSlug, userId } = await params;
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

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Sign in to view this profile
        </h2>
        <p className="text-muted-foreground">
          Sign in to your account to view attendee profiles.
        </p>
      </div>
    );
  }

  let profile;
  try {
    profile = await getAttendeeProfile(event.id, userId);
  } catch {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Profile not found</h2>
        <p className="mt-2 text-muted-foreground">
          This attendee profile does not exist or is not visible.
        </p>
      </div>
    );
  }

  const [bookmarkedIds, attendeeNotes, affiliations, education] = await Promise.all([
    getBookmarkedAttendeeIds(event.id),
    getAttendeeNotes(event.id),
    getAttendeeAffiliations(event.id, userId),
    getAttendeeEducation(event.id, userId),
  ]);
  const basePath = `/${orgSlug}/${eventSlug}/attendees`;

  return (
    <AttendeeProfileView
      profile={{
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        title: profile.title,
        company: profile.company,
        location: profile.location,
        bio: profile.bio,
        interests: (
          profile.interests as ({ id: string; name: string } | null)[]
        ).filter((i): i is { id: string; name: string } => i !== null),
        affiliations,
        education,
        links: (profile.links as { type: string; url: string; label?: string }[] | null) ?? [],
      }}
      eventId={event.id}
      basePath={basePath}
      isBookmarked={bookmarkedIds.includes(userId)}
      noteContent={attendeeNotes[userId] ?? ""}
    />
  );
}
