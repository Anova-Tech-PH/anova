import { getSessionRsvpSummaries } from "@/features/rsvp/queries";
import { RsvpDashboard } from "@/features/rsvp/components/rsvp-dashboard";
import { CalendarCheck } from "lucide-react";

export default async function RsvpPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const summaries = await getSessionRsvpSummaries(eventId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <CalendarCheck className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Session RSVP</h1>
          <p className="text-sm text-muted-foreground">
            Plan with confidence — prompt attendees to add sessions to their agendas so you can get more accurate headcounts.
          </p>
        </div>
      </div>

      <RsvpDashboard eventId={eventId} summaries={summaries} />
    </div>
  );
}
