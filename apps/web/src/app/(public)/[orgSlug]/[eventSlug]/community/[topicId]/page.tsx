import { notFound } from "next/navigation";
import { getTopicDetail } from "@/features/community/queries";
import { TopicDetail } from "@/features/community/components/topic-detail";

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; topicId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { orgSlug, eventSlug, topicId } = await params;
  const { returnTo } = await searchParams;

  let topic;
  try {
    topic = await getTopicDetail(topicId);
  } catch {
    notFound();
  }

  const basePath = `/${orgSlug}/${eventSlug}`;
  const backPath = returnTo || `${basePath}/community`;
  const backLabel = returnTo ? "Back to session" : "Back to community";

  return (
    <TopicDetail
      topic={topic}
      backPath={backPath}
      backLabel={backLabel}
    />
  );
}
