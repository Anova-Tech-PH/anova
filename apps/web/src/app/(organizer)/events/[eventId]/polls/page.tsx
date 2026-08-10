import { getPolls } from "@/features/polls/queries";
import { PollCreator } from "@/features/polls/components/poll-creator";
import { PollList } from "@/features/polls/components/poll-list";
import { createClient } from "@attendly/ui/supabase/server";

export default async function PollsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const polls = await getPolls(eventId);

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Live Polls</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage live polls for your event sessions.
        </p>
      </div>

      <PollCreator
        eventId={eventId}
        sessions={(sessions ?? []).map((s) => ({ id: s.id, title: s.title }))}
      />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All Polls</h3>
        <PollList polls={polls} eventId={eventId} />
      </div>
    </div>
  );
}
