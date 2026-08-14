import { getDiscussionTopics } from "@/features/discussion-topics/queries";
import { seedBuiltInTopics } from "@/features/discussion-topics/actions";
import { DiscussionTopicsPageClient } from "@/features/discussion-topics/components/discussion-topics-page-client";

export default async function DiscussionTopicsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Seed built-in topics on first visit (idempotent)
  await seedBuiltInTopics(eventId);

  const { custom, builtIn, total } = await getDiscussionTopics(eventId);

  return (
    <DiscussionTopicsPageClient
      eventId={eventId}
      customTopics={custom}
      builtInTopics={builtIn}
      total={total}
    />
  );
}
