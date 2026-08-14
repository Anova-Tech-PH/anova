import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { Rocket, CheckCircle2 } from "lucide-react";
import { getPublishReadiness, getPostPublishRecommendations } from "@/features/publish/queries";
import { ReadinessChecklist } from "@/features/publish/components/readiness-checklist";
import { PublishButton, UnpublishButton } from "@/features/publish/components/publish-confirmation-dialog";
import { RecommendationCards } from "@/features/publish/components/recommendation-cards";

async function getEvent(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, status, updated_at")
    .eq("id", eventId)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  return {
    title: event ? `Publish — ${event.title}` : "Publish",
  };
}

export default async function PublishPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  if (!event) notFound();

  const isPublished = event.status === "published" || event.status === "completed";
  const isCompleted = event.status === "completed";

  if (isPublished) {
    const cards = await getPostPublishRecommendations(eventId);
    const notConfiguredCount = cards.filter((c) => !c.configured).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Rocket className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Publish</h1>
            <p className="text-sm text-muted-foreground">
              {isCompleted
                ? "Your event has ended. Review features and recommendations."
                : "Your event is live. Manage features and recommendations."}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-lg border p-4 ${isCompleted ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50"}`}>
          <CheckCircle2 className={`h-5 w-5 shrink-0 ${isCompleted ? "text-blue-600" : "text-emerald-600"}`} />
          <div>
            <p className={`text-sm font-medium ${isCompleted ? "text-blue-900" : "text-emerald-900"}`}>
              {isCompleted
                ? "This event has ended."
                : "Your event is live and available to attendees."}
            </p>
            {notConfiguredCount > 0 && !isCompleted && (
              <p className="text-xs text-emerald-700 mt-0.5">
                {notConfiguredCount} feature{notConfiguredCount !== 1 ? "s" : ""}{" "}not yet configured.
                Don&apos;t miss out!
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Feature Recommendations</h2>
          <RecommendationCards cards={cards} />
        </div>

        <div className="pt-4 border-t">
          <UnpublishButton eventId={eventId} />
        </div>
      </div>
    );
  }

  const readiness = await getPublishReadiness(eventId);
  const warnings = readiness.checks.filter(
    (c) => !c.required && c.status === "warning"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <Rocket className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Publish</h1>
          <p className="text-sm text-muted-foreground">
            Review your event readiness and publish when ready.
          </p>
        </div>
      </div>

      <ReadinessChecklist
        checks={readiness.checks}
        requiredPassed={readiness.requiredPassed}
        requiredTotal={readiness.requiredTotal}
      />

      <div className="flex items-center gap-4 pt-2">
        <PublishButton
          eventId={eventId}
          eventTitle={event.title}
          canPublish={readiness.canPublish}
          warnings={warnings}
        />
        {!readiness.canPublish && (
          <p className="text-xs text-muted-foreground">
            Complete all required checks before publishing.
          </p>
        )}
      </div>
    </div>
  );
}
