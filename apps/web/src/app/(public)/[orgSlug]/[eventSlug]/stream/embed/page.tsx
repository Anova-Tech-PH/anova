import { getStreamData } from "@/features/announcement-wall/lib/get-stream-data";
import ActivityStream from "@/features/announcement-wall/components/activity-stream";
import { WallRefreshWrapper } from "@/features/announcement-wall/components/wall-refresh-wrapper";

export default async function ActivityStreamEmbedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const { items, theme, eventTitle } = await getStreamData(orgSlug, eventSlug);

  return (
    <div className="h-screen w-full overflow-hidden">
      <WallRefreshWrapper intervalMs={60_000}>
        <ActivityStream
          items={items}
          mode="embed"
          theme={theme}
          eventTitle={eventTitle}
        />
      </WallRefreshWrapper>
    </div>
  );
}
