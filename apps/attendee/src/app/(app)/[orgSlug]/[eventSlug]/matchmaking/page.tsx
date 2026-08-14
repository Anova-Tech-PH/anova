import { createClient } from "@attendly/ui/supabase/server";
import { redirect } from "next/navigation";
import {
  getEventInterestsForAttendee,
  getMatches,
} from "@/features/matchmaking/queries";
import { MatchmakingPageClient } from "@/features/matchmaking/components/matchmaking-page-client";

export default async function AttendeeMatchmakingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look up event by slug
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .single();

  if (!event) redirect(`/${orgSlug}`);

  const [interests, matches] = await Promise.all([
    getEventInterestsForAttendee(event.id, user.id),
    getMatches(event.id, user.id),
  ]);

  return (
    <MatchmakingPageClient
      eventId={event.id}
      orgSlug={orgSlug}
      eventSlug={eventSlug}
      interests={interests}
      matches={matches}
    />
  );
}
