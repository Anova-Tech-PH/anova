import { notFound } from "next/navigation";
import { getTopicDetail } from "@/features/community/queries";
import { TopicDetail } from "@/features/community/components/topic-detail";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; topicId: string }>;
}) {
  const { orgSlug, eventSlug, topicId } = await params;

  let topic;
  try {
    topic = await getTopicDetail(topicId);
  } catch {
    notFound();
  }

  return (
    <TopicDetail
      topic={topic}
      backPath={`/${orgSlug}/${eventSlug}/community`}
    />
  );
}
