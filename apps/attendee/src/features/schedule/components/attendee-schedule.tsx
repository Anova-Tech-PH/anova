"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge, Avatar } from "@attendly/ui/components";

type Track = { id: string; name: string; color: string | null };

type Session = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  tracks: Track[];
  session_speakers: {
    speaker_id: string;
    speakers: {
      id: string;
      name: string;
      title?: string | null;
      company?: string | null;
      photo?: string | null;
    };
  }[];
};

const typeBadgeVariant: Record<
  string,
  "primary" | "info" | "success" | "warning" | "default"
> = {
  keynote: "primary",
  talk: "info",
  workshop: "success",
  panel: "warning",
  break: "default",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AttendeeSchedule({
  sessions,
  tracks,
}: {
  sessions: Session[];
  tracks: Track[];
}) {
  const [activeTrackIds, setActiveTrackIds] = useState<Set<string>>(new Set());

  function toggleTrack(trackId: string) {
    setActiveTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  const filteredSessions =
    activeTrackIds.size === 0
      ? sessions
      : sessions.filter((s) => s.tracks.some((t) => activeTrackIds.has(t.id)));

  const dayGroups: Record<string, Session[]> = {};
  for (const s of filteredSessions) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (dayGroups[day] ??= []).push(s);
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <div className="h-6 w-1 rounded-full bg-primary" />
        <h2 className="text-lg font-semibold">Schedule</h2>
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {filteredSessions.filter((s) => s.type !== "break").length} sessions
        </span>
      </div>

      {/* Track filter bar */}
      {tracks.length > 0 && (
        <div className="sticky top-0 z-10 -mx-1 mt-3 flex items-center gap-2 overflow-x-auto bg-background/95 px-1 py-2 backdrop-blur-sm">
          {tracks.map((track) => {
            const isActive = activeTrackIds.has(track.id);
            return (
              <button
                key={track.id}
                onClick={() => toggleTrack(track.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-transparent text-white"
                    : "border-input bg-background hover:bg-accent"
                }`}
                style={
                  isActive
                    ? { backgroundColor: track.color ?? "#6b7280" }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: track.color ?? "#6b7280" }}
                />
                {track.name}
              </button>
            );
          })}
          {activeTrackIds.size > 0 && (
            <button
              onClick={() => setActiveTrackIds(new Set())}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Sessions by day */}
      <div className="mt-4 space-y-6">
        {Object.entries(dayGroups).map(([day, daySessions]) => (
          <div key={day}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {day}
            </h3>
            <div className="space-y-2">
              {daySessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 ${session.type === "break" ? "bg-muted/40" : "bg-card"}`}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor:
                      session.tracks[0]?.color ?? "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            typeBadgeVariant[session.type] ?? "default"
                          }
                        >
                          {session.type}
                        </Badge>
                        {session.tracks.map((track) => (
                          <span
                            key={track.id}
                            className="text-[10px] text-muted-foreground"
                          >
                            {track.name}
                          </span>
                        ))}
                      </div>
                      <h4 className="mt-1.5 font-medium text-sm">
                        {session.title}
                      </h4>
                      {session.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {session.description}
                        </p>
                      )}
                      {session.session_speakers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {session.session_speakers.map(
                            ({ speakers: sp }: any) => (
                              <div
                                key={sp.id}
                                className="flex items-center gap-1.5"
                              >
                                <Avatar
                                  src={sp.photo}
                                  name={sp.name}
                                  size="sm"
                                  className="h-5 w-5"
                                />
                                <span className="text-[11px] font-medium">
                                  {sp.name}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.start_time)}
                      </div>
                      {session.location && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
