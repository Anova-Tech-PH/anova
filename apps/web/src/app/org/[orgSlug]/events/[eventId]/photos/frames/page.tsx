import { getProfileFrames } from "@/features/profile-frames/queries";
import { ProfileFrameEditor } from "@/features/profile-frames/components/profile-frame-editor";

export default async function ProfileFramesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const frames = await getProfileFrames(eventId);
  return <ProfileFrameEditor eventId={eventId} frames={frames} />;
}
