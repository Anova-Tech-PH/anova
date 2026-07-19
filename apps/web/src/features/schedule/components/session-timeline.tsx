"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Clock, MapPin, User, CalendarDays } from "lucide-react";
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
  enable_check_in: boolean;
  track: Track | null;
  session_speakers: SessionSpeaker[];
};

type DayGroup = { label: string; month: string; day: string; sessions: Session[] };

function groupByDay(sessions: Session[]): DayGroup[] {
  const groups: Record<string, DayGroup> = {};
  for (const s of sessions) {
    const d = new Date(s.start_time);
    const label = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate().toString();
    if (!groups[label]) {
      groups[label] = { label, month, day, sessions: [] };
    }
    groups[label].sessions.push(s);
  }
  return Object.values(groups);
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

  const speakerColors = ["bg-primary/60", "bg-amber-400/60", "bg-rose-400/60", "bg-violet-400/60", "bg-emerald-400/60"];

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
    enable_check_in: boolean;
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
        enable_check_in: data.enable_check_in,
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
    enable_check_in: boolean;
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
        enable_check_in: data.enable_check_in,
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
          icon={<CalendarDays className="h-8 w-8" />}
          title="No sessions yet"
          description="Add your first session to build the schedule."
        />
      ) : (
        dayGroups.map((group) => (
          <div key={group.label} className="space-y-3">
            {/* Day header with calendar-page indicator */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-background shadow-sm">
                <span className="text-[10px] font-semibold uppercase leading-none text-primary">
                  {group.month}
                </span>
                <span className="text-lg font-bold leading-tight">{group.day}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold">{group.label}</h4>
                <p className="text-xs text-muted-foreground">{group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Timeline with vertical line */}
            <div className="relative ml-[23px] border-l-2 border-muted pl-6 space-y-2">
              {group.sessions.map((session) => {
                const isBreak = session.type === "break";
                return (
                  <div key={session.id} className="group relative">
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[31px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background"
                      style={{ backgroundColor: session.track?.color ?? (isBreak ? "var(--color-muted-foreground)" : "var(--color-primary)") }}
                    />

                    <Card
                      className={`p-4 transition-all duration-200 hover:shadow-md ${
                        isBreak ? "border-dashed bg-muted/30" : ""
                      }`}
                      style={{
                        borderLeftWidth: isBreak ? undefined : 4,
                        borderLeftColor: isBreak ? undefined : (session.track?.color ?? "transparent"),
                        borderLeftStyle: isBreak ? undefined : "solid",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Time label - prominent */}
                          <div className="mb-1.5 text-xs font-semibold text-primary/80">
                            {formatTime(session.start_time)} — {formatTime(session.end_time)}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={typeBadgeVariant[session.type] ?? "default"} className="text-[10px]">
                              {session.type}
                            </Badge>
                            {session.track && (
                              <span
                                className="flex items-center gap-1 text-[10px] font-medium"
                                style={{ color: session.track.color ?? undefined }}
                              >
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: session.track.color ?? "currentColor" }}
                                />
                                {session.track.name}
                              </span>
                            )}
                          </div>

                          <h5 className={`mt-1 font-medium ${isBreak ? "italic text-muted-foreground text-sm" : ""}`}>
                            {session.title}
                          </h5>

                          {!isBreak && (
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {session.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.location}
                                </span>
                              )}
                            </div>
                          )}

                          {session.session_speakers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {session.session_speakers.map(({ speakers: sp }, spIndex) => (
                                <span
                                  key={sp.id}
                                  className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px]"
                                >
                                  <span
                                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ${
                                      speakerColors[spIndex % speakerColors.length]
                                    }`}
                                  >
                                    {sp.name.charAt(0).toUpperCase()}
                                  </span>
                                  {sp.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions - shown on hover */}
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <button
                            onClick={() => setEditingSession(session)}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(session)}
                            disabled={isPending}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
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
            enable_check_in: editingSession.enable_check_in,
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
