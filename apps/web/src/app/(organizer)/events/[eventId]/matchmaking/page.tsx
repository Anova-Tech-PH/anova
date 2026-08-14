import { getEventInterests } from "@/features/matchmaking/queries";
import { MatchmakingPageClient } from "@/features/matchmaking/components/matchmaking-page-client";

export default async function MatchmakingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { interests, total, attendeesParticipating } = await getEventInterests(eventId);

  return (
    <MatchmakingPageClient
      eventId={eventId}
      interests={interests}
      total={total}
      attendeesParticipating={attendeesParticipating}
    />
  );
}
