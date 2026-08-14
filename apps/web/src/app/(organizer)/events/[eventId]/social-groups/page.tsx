import { getSocialGroups } from "@/features/social-groups/queries";
import { SocialGroupsPageClient } from "@/features/social-groups/components/social-groups-page-client";

export default async function SocialGroupsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const { groups, total } = await getSocialGroups(eventId);

  return (
    <SocialGroupsPageClient
      eventId={eventId}
      groups={groups}
      total={total}
    />
  );
}
