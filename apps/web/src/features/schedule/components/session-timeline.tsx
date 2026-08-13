"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Clock, MapPin, User, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, Card, EmptyState, useConfirm } from "@attendly/ui/components";
import { SessionForm } from "./session-form";
import { createSession, updateSession, deleteSession, bulkAssignTracks } from "../actions";

type Track = { id: string; name: string; color: string | null };
type Speaker = { id: string; name: string; title?: string | null; company?: string | null; photo?: string | null };
type SessionSpeaker = { speaker_id: string; speakers: Speaker };
type EventDocumentOption = { id: string; title: string };
type EventPollOption = { id: string; question: string };
type Session = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  enable_check_in: boolean;
  rsvp_enabled: boolean;
  capacity: number | null;
  tracks: Track[];
  session_speakers: SessionSpeaker[];
  document_ids?: string[];
  poll_ids?: string[];
};

type DayGroup = { label: string; month: string; day: string; weekday: string; dateKey: string; sessions: Session[] };

function groupByDay(sessions: Session[]): DayGroup[] {
  const groups: Record<string, DayGroup> = {};
  for (const s of sessions) {
    const d = new Date(s.start_time);
    const dateKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate().toString();
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    if (!groups[dateKey]) {
      groups[dateKey] = { label, month, day, weekday, dateKey, sessions: [] };
    }
    groups[dateKey].sessions.push(s);
  }
  return Object.values(groups).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
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
  rooms = [],
  eventDocuments = [],
  eventPolls = [],
}: {
  eventId: string;
  initialSessions: Session[];
  tracks: Track[];
  speakers: Speaker[];
  rooms?: string[];
  eventDocuments?: EventDocumentOption[];
  eventPolls?: EventPollOption[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkTracks, setShowBulkTracks] = useState(false);
  const [bulkTrackIds, setBulkTrackIds] = useState<string[]>([]);

  function toggleSelect(sessionId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function toggleSelectAll(daySessions: Session[]) {
    const allSelected = daySessions.every((s) => selectedIds.has(s.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of daySessions) {
        if (allSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  }

  async function handleBulkAssign() {
    try {
      await bulkAssignTracks(eventId, Array.from(selectedIds), bulkTrackIds);
      // Update local state
      setSessions((prev) =>
        prev.map((s) => {
          if (!selectedIds.has(s.id)) return s;
          return {
            ...s,
            tracks: bulkTrackIds
              .map((tid) => tracks.find((t) => t.id === tid))
              .filter((t): t is Track => !!t),
          };
        })
      );
      setSelectedIds(new Set());
      setShowBulkTracks(false);
      setBulkTrackIds([]);
      toast.success(`Tracks assigned to ${selectedIds.size} sessions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign tracks");
    }
  }

  const dayGroups = groupByDay(sessions);
  const isMultiDay = dayGroups.length > 1;
  const activeDayKey = selectedDay ?? dayGroups[0]?.dateKey ?? null;
  const activeGroup = dayGroups.find((g) => g.dateKey === activeDayKey);

  // Compute default date/time for new sessions based on last session on active day
  const nextSessionDefaults = (() => {
    if (!activeGroup) return undefined;
    const daySessions = activeGroup.sessions;
    if (daySessions.length === 0) {
      // No sessions yet on this day — default to the day at 9:00 AM
      return { date: activeGroup.dateKey, start_time: "09:00", end_time: "10:00" };
    }
    const lastSession = daySessions[daySessions.length - 1];
    const lastEnd = new Date(lastSession.end_time);
    const newStart = lastEnd;
    const newEnd = new Date(lastEnd.getTime() + 60 * 60 * 1000); // +1 hour
    return {
      date: activeGroup.dateKey,
      start_time: toLocalTime(newStart.toISOString()),
      end_time: toLocalTime(newEnd.toISOString()),
    };
  })();

  const speakerColors = ["bg-primary/60", "bg-amber-400/60", "bg-rose-400/60", "bg-emerald-400/60", "bg-emerald-400/60"];

  function toLocalDate(iso: string) {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 10);
  }

  function toLocalTime(iso: string) {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(11, 16);
  }

  async function handleCreate(data: {
    title: string;
    description: string;
    type: string;
    start_time: string;
    end_time: string;
    location: string;
    track_ids: string[];
    speaker_ids: string[];
    enable_check_in: boolean;
    rsvp_enabled: boolean;
    capacity: number | null;
    document_ids: string[];
    poll_ids: string[];
  }) {
    try {
      const session = await createSession(eventId, {
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        location: data.location || undefined,
        track_ids: data.track_ids,
        speaker_ids: data.speaker_ids,
        enable_check_in: data.enable_check_in,
        rsvp_enabled: data.rsvp_enabled,
        capacity: data.capacity,
        document_ids: data.document_ids,
        poll_ids: data.poll_ids,
      });

      // Refetch to get joined data
      const enriched: Session = {
        ...session,
        tracks: data.track_ids
          .map((tid) => tracks.find((t) => t.id === tid))
          .filter((t): t is Track => !!t),
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
    track_ids: string[];
    speaker_ids: string[];
    enable_check_in: boolean;
    rsvp_enabled: boolean;
    capacity: number | null;
    document_ids: string[];
    poll_ids: string[];
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
        track_ids: data.track_ids,
        speaker_ids: data.speaker_ids,
        enable_check_in: data.enable_check_in,
        rsvp_enabled: data.rsvp_enabled,
        capacity: data.capacity,
        document_ids: data.document_ids,
        poll_ids: data.poll_ids,
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
                  tracks: data.track_ids
                    .map((tid) => tracks.find((t) => t.id === tid))
                    .filter((t): t is Track => !!t),
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

  async function handleDelete(session: Session) {
    const ok = await confirm({
      title: "Delete Session",
      description: `Delete session "${session.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
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
          title="No sessions"
          description="Add sessions to build out the event schedule."
        />
      ) : (
        <>
          {/* Date tabs for multi-day events */}
          {isMultiDay && (
            <div className="flex gap-1 border-b pb-1" role="tablist">
              {dayGroups.map((group) => (
                <button
                  key={group.dateKey}
                  role="tab"
                  aria-selected={group.dateKey === activeDayKey}
                  onClick={() => setSelectedDay(group.dateKey)}
                  className={`flex flex-col items-center rounded-lg px-4 py-2 text-sm transition-colors ${
                    group.dateKey === activeDayKey
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <span className="text-xs">{group.weekday}</span>
                  <span className="text-base font-bold">{group.month} {group.day}</span>
                </button>
              ))}
            </div>
          )}

          {/* Active day content */}
          {activeGroup && (
            <div className="space-y-3">
              {/* Day header */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-background shadow-sm">
                  <span className="text-[10px] font-semibold uppercase leading-none text-primary">
                    {activeGroup.month}
                  </span>
                  <span className="text-lg font-bold leading-tight">{activeGroup.day}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{activeGroup.label}</h4>
                  <p className="text-xs text-muted-foreground">{activeGroup.sessions.length} session{activeGroup.sessions.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeGroup.sessions.every((s) => selectedIds.has(s.id))}
                  onChange={() => toggleSelectAll(activeGroup.sessions)}
                  className="h-3.5 w-3.5 rounded accent-primary"
                />
                Select all
              </label>

              {/* Timeline with vertical line */}
              <div className="relative ml-[23px] border-l-2 border-muted pl-6 space-y-2">
                {activeGroup.sessions.map((session) => {
                  const isBreak = session.type === "break";
                  return (
                    <div key={session.id} className="group relative">
                      {/* Selection checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(session.id)}
                        onChange={() => toggleSelect(session.id)}
                        className="absolute -left-[55px] top-4 h-4 w-4 rounded border-muted-foreground accent-primary"
                        style={{ opacity: selectedIds.size > 0 ? 1 : undefined }}
                      />

                      {/* Timeline dot */}
                      <div
                        className="absolute -left-[31px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background"
                        style={{ backgroundColor: session.tracks[0]?.color ?? (isBreak ? "var(--color-muted-foreground)" : "var(--color-primary)") }}
                      />

                      <Card
                        className={`p-4 transition-all duration-200 hover:shadow-md ${
                          isBreak ? "border-dashed bg-muted/30" : ""
                        }`}
                        style={{
                          borderLeftWidth: isBreak ? undefined : 4,
                          borderLeftColor: isBreak ? undefined : (session.tracks[0]?.color ?? "transparent"),
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
                              {session.tracks.length > 0 && session.tracks.map((track) => (
                                <span
                                  key={track.id}
                                  className="flex items-center gap-1 text-[10px] font-medium"
                                  style={{ color: track.color ?? undefined }}
                                >
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: track.color ?? "currentColor" }}
                                  />
                                  {track.name}
                                </span>
                              ))}
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
          )}
        </>
      )}

      {showForm && (
        <SessionForm
          eventId={eventId}
          tracks={tracks}
          speakers={speakers}
          rooms={rooms}
          defaults={nextSessionDefaults}
          eventDocuments={eventDocuments}
          eventPolls={eventPolls}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingSession && (
        <SessionForm
          eventId={eventId}
          session={{
            id: editingSession.id,
            title: editingSession.title,
            description: editingSession.description ?? "",
            type: editingSession.type,
            date: toLocalDate(editingSession.start_time),
            start_time: toLocalTime(editingSession.start_time),
            end_time: toLocalTime(editingSession.end_time),
            location: editingSession.location ?? "",
            track_ids: editingSession.tracks.map((t) => t.id),
            speaker_ids: editingSession.session_speakers.map((ss) => ss.speaker_id),
            enable_check_in: editingSession.enable_check_in,
            rsvp_enabled: editingSession.rsvp_enabled ?? false,
            capacity: editingSession.capacity ?? null,
            document_ids: editingSession.document_ids ?? [],
            poll_ids: editingSession.poll_ids ?? [],
          }}
          tracks={tracks}
          speakers={speakers}
          rooms={rooms}
          eventDocuments={eventDocuments}
          eventPolls={eventPolls}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSession(null)}
        />
      )}

      {confirmDialog}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} session{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setShowBulkTracks(!showBulkTracks)}>
              Assign Tracks
            </Button>
            {showBulkTracks && (
              <div className="absolute bottom-full mb-2 left-0 rounded-lg border bg-card p-3 shadow-lg min-w-[200px]">
                <div className="space-y-2">
                  {tracks.map((track) => (
                    <label key={track.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkTrackIds.includes(track.id)}
                        onChange={() => setBulkTrackIds((prev) =>
                          prev.includes(track.id)
                            ? prev.filter((id) => id !== track.id)
                            : [...prev, track.id]
                        )}
                        className="h-3.5 w-3.5 rounded accent-primary"
                      />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: track.color ?? "#888" }} />
                      {track.name}
                    </label>
                  ))}
                  <Button size="sm" className="w-full mt-2" onClick={handleBulkAssign}>
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setShowBulkTracks(false); setBulkTrackIds([]); }}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
