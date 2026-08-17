import {
  getPhotos,
  getPhotoCount,
  getPhotoStats,
} from "@/features/photos/queries";
import { PhotoCollection } from "@/features/photos/components/photo-collection";

export default async function PhotoCollectionPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [{ photos, total }, counts, stats] = await Promise.all([
    getPhotos(eventId),
    getPhotoCount(eventId),
    getPhotoStats(eventId),
  ]);

  return (
    <PhotoCollection
      eventId={eventId}
      initialPhotos={photos}
      initialTotal={total}
      counts={counts}
      stats={stats}
    />
  );
}
