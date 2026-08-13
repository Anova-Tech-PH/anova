import { CalendarCheck } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function SpeakerMeetingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Speaker 1-1 Meetings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule and manage one-on-one meetings between speakers and organizers.
        </p>
      </div>

      <ComingSoon
        title="Speaker 1-1 Meetings"
        description="Allow speakers to book one-on-one meetings with organizers or other speakers. Manage availability, time slots, and meeting logistics all in one place."
        icon={<CalendarCheck className="h-7 w-7" />}
      />
    </div>
  );
}
