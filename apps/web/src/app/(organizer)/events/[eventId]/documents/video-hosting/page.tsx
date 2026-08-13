import { Video } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function VideoHostingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Video Hosting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Host and manage video content for your event.
        </p>
      </div>

      <ComingSoon
        title="Video Hosting"
        description="Upload and host video recordings for your event sessions. Track storage usage, manage video quality, and control playback settings."
        icon={<Video className="h-7 w-7" />}
      />
    </div>
  );
}
