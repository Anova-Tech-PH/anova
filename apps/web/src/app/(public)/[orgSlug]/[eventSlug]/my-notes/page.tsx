import { createClient } from "@attendly/ui/supabase/server";
import { StickyNote, Clock, CalendarDays, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "../auth-guard";
import { getMyNotes } from "@/features/session-notes/queries";
import { NoteCard } from "@/features/session-notes/components/note-button";
import { ExportButtonClient } from "./export-button-client";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").trim();
}

// Group notes by date (updated_at)
function groupByDate(notes: any[]) {
  const map = new Map<string, any[]>();
  for (const note of notes) {
    const key = formatDate(note.updated_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  return Array.from(map.entries());
}

export default async function MyNotesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const basePath = `/${orgSlug}/${eventSlug}`;
  const currentPath = `${basePath}/my-notes`;

  return (
    <AuthGuard currentPath={currentPath}>
      <MyNotesContent orgSlug={orgSlug} eventSlug={eventSlug} />
    </AuthGuard>
  );
}

async function MyNotesContent({
  orgSlug,
  eventSlug,
}: {
  orgSlug: string;
  eventSlug: string;
}) {
  const supabase = await createClient();
  const basePath = `/${orgSlug}/${eventSlug}`;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Event not found</h2>
      </div>
    );
  }

  const notes = await getMyNotes(event.id);
  const grouped = groupByDate(notes);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Notes</h1>
          {notes.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {notes.length} {notes.length === 1 ? "note" : "notes"} across sessions
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Link
            href={`${basePath}/schedule`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            Schedule
          </Link>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
            <StickyNote className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="mt-5 text-lg font-semibold">No notes yet</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Take personal notes on any session from the schedule. Your notes are private and only visible to you.
          </p>
          <Link
            href={`${basePath}/schedule`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse schedule
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(([dateLabel, dateNotes]) => (
            <div key={dateLabel}>
              {/* Date group header */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {dateLabel}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                {dateNotes.map((note: any) => {
                  const sessionTitle = note.sessions?.title ?? "Unknown session";
                  const preview = stripHtml(note.content ?? "");

                  return (
                    <div
                      key={note.id}
                      className="group rounded-xl border bg-card transition-shadow hover:shadow-md"
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <Link
                          href={`${basePath}/schedule/${note.session_id}`}
                          className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                          {sessionTitle}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {note.sessions?.start_time && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(note.sessions.start_time)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(note.updated_at)}
                          </span>
                        </div>
                      </div>

                      {/* Note editor */}
                      <div className="p-4">
                        <NoteCard
                          sessionId={note.session_id}
                          initialContent={note.content}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportButton() {
  return <ExportButtonClient />;
}
