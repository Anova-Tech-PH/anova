import { notFound } from "next/navigation";
import { getSocialGroup, getGroupPosts, getGroupMembers } from "@/features/social-groups/queries";
import { GroupDetailPageClient } from "@/features/social-groups/components/group-detail-page-client";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; groupId: string }>;
}) {
  const { eventId, groupId } = await params;

  const group = await getSocialGroup(groupId);
  if (!group) notFound();

  const [posts, members] = await Promise.all([
    getGroupPosts(groupId),
    getGroupMembers(groupId),
  ]);

  return (
    <GroupDetailPageClient
      eventId={eventId}
      group={group}
      posts={posts}
      members={members}
    />
  );
}
