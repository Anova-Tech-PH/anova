import { getSurveyByEvent, getSurveyStats } from "@/features/surveys/queries";
import { SurveyBuilder } from "@/features/surveys/components/survey-builder";
import { SurveyResults } from "@/features/surveys/components/survey-results";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const survey = await getSurveyByEvent(eventId);
  const stats = survey
    ? await getSurveyStats(survey.id, survey.questions)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Post-Event Survey</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a feedback survey for your attendees. Share the link after your event.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <SurveyBuilder eventId={eventId} initialSurvey={survey} />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          {survey && stats ? (
            <SurveyResults stats={stats} questions={survey.questions} />
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
              Create a survey to start collecting responses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
