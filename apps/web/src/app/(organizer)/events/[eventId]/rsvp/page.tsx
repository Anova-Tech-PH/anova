import { getSessionRsvpSummaries } from "@/features/rsvp/queries";
import { RsvpDashboard } from "@/features/rsvp/components/rsvp-dashboard";

export default async function RsvpPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const summaries = await getSessionRsvpSummaries(eventId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Session RSVPs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track RSVP counts, capacity, and waitlists across all sessions.
        </p>
      </div>
      <RsvpDashboard summaries={summaries} />
    </div>
  );
}
