import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { getSessionQuestions } from "@/features/session-qa/queries";
import { QAQuestionList } from "@/features/session-qa/components/qa-question-list";
import { AskQuestionForm } from "@/features/session-qa/components/ask-question-form";

export default async function QADetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; sessionId: string }>;
}) {
  const { orgSlug, eventSlug, sessionId } = await params;
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

  // Fetch session info
  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, start_time, end_time")
    .eq("id", sessionId)
    .eq("event_id", event.id)
    .single();

  if (!session) notFound();

  // Fetch questions
  const questions = await getSessionQuestions(sessionId);

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessionDate = new Date(session.start_time).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/${orgSlug}/${eventSlug}/qa`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Sessions
      </Link>

      <p className="text-xs text-muted-foreground mb-4">{sessionDate}</p>

      <QAQuestionList questions={questions} sessionTitle={session.title} />

      {user ? (
        <div className="mt-8 rounded-xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-medium">Ask a Question</h3>
          <AskQuestionForm sessionId={sessionId} eventId={event.id} />
        </div>
      ) : (
        <div className="mt-8 rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to ask questions and upvote.
          </p>
          <a
            href={`/${orgSlug}/${eventSlug}/register`}
            className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign In
          </a>
        </div>
      )}
    </div>
  );
}
