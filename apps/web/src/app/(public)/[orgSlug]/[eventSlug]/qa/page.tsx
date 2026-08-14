import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getSessionsWithQA } from "@/features/session-qa/queries";
import { QASessionList } from "@/features/session-qa/components/qa-session-list";

export default async function QAListPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Resolve organization
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  // Resolve event
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .in("status", ["published", "completed"])
    .single();

  if (!event) notFound();

  // Check auth and get bookmarked sessions
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bookmarkedSessionIds: string[] = [];
  if (user) {
    const { data: bookmarks } = await supabase
      .from("session_bookmarks")
      .select("session_id")
      .eq("user_id", user.id);
    bookmarkedSessionIds = (bookmarks ?? []).map((b) => b.session_id);
  }

  // Fetch sessions with Q&A counts
  const { myAgenda, other } = await getSessionsWithQA(event.id, {
    bookmarkedSessionIds,
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-semibold">{event.title} — Q&A</h1>
        <div className="mt-8 rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Sign in to ask questions and upvote during sessions.
          </p>
          <a
            href={`/${orgSlug}/${eventSlug}/register`}
            className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign In
          </a>
        </div>

        {/* Still show the session list for unauthenticated users */}
        <div className="mt-8">
          <QASessionList
            myAgenda={[]}
            other={other}
            eventSlug={eventSlug}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{event.title} — Q&A</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask questions and upvote the ones you want answered.
      </p>

      <div className="mt-8">
        <QASessionList
          myAgenda={myAgenda}
          other={other}
          eventSlug={eventSlug}
        />
      </div>
    </div>
  );
}
