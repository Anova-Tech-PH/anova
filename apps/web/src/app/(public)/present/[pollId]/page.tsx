import { notFound } from "next/navigation";
import { getPollWithResults } from "@/features/polls/queries";
import { PollPresentationView } from "@/features/polls/components/poll-presentation-view";
import { WallRefreshWrapper } from "@/features/announcement-wall/components/wall-refresh-wrapper";

export default async function PollPresentPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const poll = await getPollWithResults(pollId);
  if (!poll) notFound();

  return (
    <WallRefreshWrapper intervalMs={5_000}>
      <PollPresentationView poll={poll} />
    </WallRefreshWrapper>
  );
}
