import { createClient } from "@attendly/ui/supabase/server";
import { StickyNote, Clock } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "../auth-guard";
import { getMyNotes } from "@/features/session-notes/queries";
import { NoteButton } from "@/features/session-notes/components/note-button";
import { ExportButtonClient } from "./export-button-client";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Notes</h1>
        <ExportButton />
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <StickyNote className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No notes yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add notes to sessions from the schedule page
          </p>
          <Link
            href={`${basePath}/schedule`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to schedule
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {notes.map((note: any) => (
            <div key={note.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {note.sessions?.title ?? "Unknown session"}
                </h3>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(note.updated_at)}
                </span>
              </div>
              {note.sessions?.start_time && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(note.sessions.start_time)}
                </p>
              )}
              <div className="mt-3">
                <NoteButton
                  sessionId={note.session_id}
                  initialContent={note.content}
                />
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
