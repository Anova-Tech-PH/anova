import { getModerationQueue, getQAStats } from "@/features/qa/queries";
import { QAStatsCards } from "@/features/qa/components/qa-stats";
import { ModerationQueue } from "@/features/qa/components/moderation-queue";

export default async function SessionQAManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [queue, stats] = await Promise.all([
    getModerationQueue(eventId),
    getQAStats(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Session Q&A Manager</h1>
        <p className="text-sm text-muted-foreground">
          Review and moderate questions submitted by attendees across all
          sessions.
        </p>
      </div>

      <QAStatsCards stats={stats} />

      <div>
        <h3 className="mb-4 text-base font-semibold">Moderation Queue</h3>
        <ModerationQueue questions={queue} eventId={eventId} />
      </div>
    </div>
  );
}
