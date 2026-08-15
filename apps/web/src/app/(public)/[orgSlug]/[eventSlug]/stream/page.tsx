import { getStreamData } from "@/features/announcement-wall/lib/get-stream-data";
import ActivityStream from "@/features/announcement-wall/components/activity-stream";
import { WallRefreshWrapper } from "@/features/announcement-wall/components/wall-refresh-wrapper";

export default async function ActivityStreamPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const { items, theme, eventTitle } = await getStreamData(orgSlug, eventSlug);

  return (
    <div className="fixed inset-0 z-50">
      <WallRefreshWrapper intervalMs={60_000}>
        <ActivityStream
          items={items}
          mode="full"
          theme={theme}
          eventTitle={eventTitle}
        />
      </WallRefreshWrapper>
    </div>
  );
}
