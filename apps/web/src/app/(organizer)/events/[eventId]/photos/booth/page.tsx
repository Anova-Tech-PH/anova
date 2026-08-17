import { getBoothFrames } from "@/features/photo-booth/queries";
import { BoothFrameEditor } from "@/features/photo-booth/components/booth-frame-editor";

export default async function PhotoBoothPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const frames = await getBoothFrames(eventId);
  return <BoothFrameEditor eventId={eventId} frames={frames} />;
}
