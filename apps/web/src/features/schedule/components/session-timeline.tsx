"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Clock, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, Card, EmptyState } from "@/shared/components/ui";
import { SessionForm } from "./session-form";
import { createSession, updateSession, deleteSession } from "../actions";

type Track = { id: string; name: string; color: string | null };
type Speaker = { id: string; name: string; title?: string | null; company?: string | null; photo?: string | null };
type SessionSpeaker = { speaker_id: string; speakers: Speaker };
type Session = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  track: Track | null;
  session_speakers: SessionSpeaker[];
};

function groupByDay(sessions: Session[]): Record<string, Session[]> {
  const groups: Record<string, Session[]> = {};
  for (const s of sessions) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (groups[day] ??= []).push(s);
  }
  return groups;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const typeBadgeVariant: Record<string, "info" | "success" | "default" | "warning" | "destructive"> = {
  keynote: "warning",
  talk: "info",
  workshop: "success",
  panel: "warning",
  break: "default",
};

export function SessionTimeline({
  eventId,
  initialSessions,
  tracks,
  speakers,
}: {
  eventId: string;
  initialSessions: Session[];
  tracks: Track[];
  speakers: Speaker[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isPending, startTransition] = useTransition();

  const dayGroups = groupByDay(sessions);

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  async function handleCreate(data: {
    title: string;
    description: string;
    type: string;
    start_time: string;
    end_time: string;
    location: string;
    track_id: string;
    speaker_ids: string[];
  }) {
    try {
      const session = await createSession(eventId, {
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        location: data.location || undefined,
        track_id: data.track_id || undefined,
        speaker_ids: data.speaker_ids,
      });

      // Refetch to get joined data
      const enriched: Session = {
        ...session,
        track: tracks.find((t) => t.id === data.track_id) ?? null,
        session_speakers: data.speaker_ids.map((sid) => ({
          speaker_id: sid,
          speakers: speakers.find((s) => s.id === sid)!,
        })),
      };

      setSessions((prev) =>
        [...prev, enriched].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      );
      setShowForm(false);
      toast.success("Session added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add session");
    }
  }

  async function handleUpdate(data: {
    title: string;
    description: string;
    type: string;
    start_time: string;
    end_time: string;
    location: string;
    track_id: string;
    speaker_ids: string[];
  }) {
    if (!editingSession) return;
    try {
      await updateSession(eventId, editingSession.id, {
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        location: data.location || undefined,
        track_id: data.track_id || null,
        speaker_ids: data.speaker_ids,
      });

      setSessions((prev) =>
        prev
          .map((s) =>
            s.id === editingSession.id
              ? {
                  ...s,
                  ...data,
                  start_time: new Date(data.start_time).toISOString(),
                  end_time: new Date(data.end_time).toISOString(),
                  track: tracks.find((t) => t.id === data.track_id) ?? null,
                  session_speakers: data.speaker_ids.map((sid) => ({
                    speaker_id: sid,
                    speakers: speakers.find((sp) => sp.id === sid)!,
                  })),
                }
              : s
          )
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      );
      setEditingSession(null);
      toast.success("Session updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update session");
    }
  }

  function handleDelete(session: Session) {
    if (!confirm(`Delete session "${session.title}"?`)) return;
    startTransition(async () => {
      try {
        await deleteSession(eventId, session.id);
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
        toast.success("Session deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete session");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sessions</h3>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Add your first session to build the schedule."
        />
      ) : (
        Object.entries(dayGroups).map(([day, daySessions]) => (
          <div key={day} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">{day}</h4>
            <div className="space-y-2">
              {daySessions.map((session) => (
                <Card
                  key={session.id}
                  className={`p-4 ${session.type === "break" ? "opacity-60" : ""}`}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: session.track?.color ?? "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeBadgeVariant[session.type] ?? "default"} className="text-[10px]">
                          {session.type}
                        </Badge>
                        {session.track && (
                          <span className="text-[10px] text-muted-foreground">
                            {session.track.name}
                          </span>
                        )}
                      </div>
                      <h5 className="mt-1 font-medium">{session.title}</h5>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        )}
                      </div>
                      {session.session_speakers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {session.session_speakers.map(({ speakers: sp }) => (
                            <span
                              key={sp.id}
                              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
                            >
                              <User className="h-2.5 w-2.5" />
                              {sp.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setEditingSession(session)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(session)}
                        disabled={isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <SessionForm
          tracks={tracks}
          speakers={speakers}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingSession && (
        <SessionForm
          session={{
            id: editingSession.id,
            title: editingSession.title,
            description: editingSession.description ?? "",
            type: editingSession.type,
            start_time: toLocalInput(editingSession.start_time),
            end_time: toLocalInput(editingSession.end_time),
            location: editingSession.location ?? "",
            track_id: editingSession.track?.id ?? "",
            speaker_ids: editingSession.session_speakers.map((ss) => ss.speaker_id),
          }}
          tracks={tracks}
          speakers={speakers}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSession(null)}
        />
      )}
    </div>
  );
}
