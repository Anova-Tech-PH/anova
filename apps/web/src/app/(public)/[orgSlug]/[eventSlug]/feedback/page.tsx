import { notFound } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { FeedbackForm } from "./feedback-form";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .in("status", ["published", "completed"])
    .single();

  if (!event) notFound();

  const { data: survey } = await supabase
    .from("surveys")
    .select("*")
    .eq("event_id", event.id)
    .eq("active", true)
    .single();

  if (!survey) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">{event.title}</h1>
        <p className="mt-4 text-muted-foreground">
          No survey is currently available for this event.
        </p>
        <Link
          href={`/${orgSlug}/${eventSlug}`}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>
      </div>
    );
  }

  const questions = (survey.questions ?? []) as Array<{
    id: string;
    label: string;
    type: "rating" | "text" | "select";
    options?: string[];
    required: boolean;
  }>;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link
        href={`/${orgSlug}/${eventSlug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <div className="mb-8 rounded-xl border bg-gradient-to-br from-primary/[0.04] to-transparent p-5">
        <h1 className="text-xl font-semibold">{survey.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{event.title}</p>
      </div>

      <FeedbackForm
        surveyId={survey.id}
        questions={questions}
      />

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <Shield className="h-3.5 w-3.5" />
        Secured by Evenstry
      </div>
    </div>
  );
}
