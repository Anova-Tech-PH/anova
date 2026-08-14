import { getFeedbackForms, getEventFeedbackSummary } from "@/features/feedback/queries";
import { FeedbackFormBuilder } from "@/features/feedback/components/feedback-form-builder";
import { FeedbackResults } from "@/features/feedback/components/feedback-results";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const forms = await getFeedbackForms(eventId);
  const summaries = await getEventFeedbackSummary(eventId);

  const defaultForm = forms.find((f) => f.is_default) ?? forms[0] ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Session Feedback</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create feedback forms for your sessions and view response summaries.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <FeedbackFormBuilder eventId={eventId} initialForm={defaultForm} />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          <FeedbackResults summaries={summaries} eventId={eventId} />
        </div>
      </div>
    </div>
  );
}
