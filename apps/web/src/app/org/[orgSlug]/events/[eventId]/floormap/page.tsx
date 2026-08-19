import {
  getFloormapsByEvent,
  getFloormapWithMarkers,
  getEventLocations,
} from "@/features/floormap/queries";
import { FloormapPageClient } from "./floormap-page-client";

export default async function FloormapPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [floormaps, sessionLocations] = await Promise.all([
    getFloormapsByEvent(eventId),
    getEventLocations(eventId),
  ]);

  const firstFloormap = floormaps[0]
    ? await getFloormapWithMarkers(floormaps[0].id)
    : null;

  return (
    <FloormapPageClient
      eventId={eventId}
      floormaps={floormaps}
      initialFloormap={firstFloormap}
      sessionLocations={sessionLocations}
    />
  );
}
