"use client";

import { SessionTimeline } from "@/features/schedule/components/session-timeline";
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
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AgendaImportExport eventId={eventId} sessions={initialSessions} />
      </div>
      <SessionTimeline
        eventId={eventId}
        initialSessions={initialSessions}
        tracks={initialTracks}
        speakers={initialSpeakers}
      />
    </div>
  );
}
