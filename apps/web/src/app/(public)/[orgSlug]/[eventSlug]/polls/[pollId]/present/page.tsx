import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getPollWithResults } from "@/features/polls/queries";
import { PollPresentationView } from "@/features/polls/components/poll-presentation-view";
import { WallRefreshWrapper } from "@/features/announcement-wall/components/wall-refresh-wrapper";

export default async function PollPresentPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; pollId: string }>;
}) {
  const { orgSlug, eventSlug, pollId } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();
  if (!event) notFound();

  const poll = await getPollWithResults(pollId);
  if (!poll || poll.event_id !== event.id) notFound();

  return (
    <WallRefreshWrapper intervalMs={5_000}>
      <PollPresentationView poll={poll} />
    </WallRefreshWrapper>
  );
}
