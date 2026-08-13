"use client";

import { useState } from "react";
import { TrackManager } from "@/features/schedule/components/track-manager";
import { SessionTimeline } from "@/features/schedule/components/session-timeline";
import { SpeakerList } from "@/features/speakers/components/speaker-list";
import { AgendaImportExport } from "@/features/schedule/components/agenda-import-export";

type Track = { id: string; name: string; color: string | null; sort_order: number };
type Speaker = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  website_url: string | null;
  is_featured: boolean;
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
        <div className="mb-2 flex justify-end">
          <AgendaImportExport eventId={eventId} sessions={initialSessions} />
        </div>
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
