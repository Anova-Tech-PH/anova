"use client";

import { useState } from "react";
import { TrackManager } from "@/features/schedule/components/track-manager";
import { SessionTimeline } from "@/features/schedule/components/session-timeline";
import { SpeakerList } from "@/features/speakers/components/speaker-list";

type Track = { id: string; name: string; color: string | null; sort_order: number };
type Speaker = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  email: string | null;
};

export function ScheduleEditor({
  eventId,
  initialTracks,
  initialSessions,
  initialSpeakers,
}: {
  eventId: string;
  initialTracks: Track[];
  initialSessions: any[];
  initialSpeakers: Speaker[];
}) {
  const [tracks, setTracks] = useState(initialTracks);

  return (
    <div className="space-y-8">
      <TrackManager
        eventId={eventId}
        initialTracks={initialTracks}
        onTracksChange={setTracks}
      />

      <div className="border-t pt-6">
        <SpeakerList eventId={eventId} initialSpeakers={initialSpeakers} />
      </div>

      <div className="border-t pt-6">
        <SessionTimeline
          eventId={eventId}
          initialSessions={initialSessions}
          tracks={tracks}
          speakers={initialSpeakers}
        />
      </div>
    </div>
  );
}
