import { getSurveysByEvent, getSurveyStats, getSurveyResponses } from "@/features/surveys/queries";
import { SurveyList } from "@/features/surveys/components/survey-list";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const surveys = await getSurveysByEvent(eventId);

  // Fetch stats and raw responses for all surveys in parallel
  const statsEntries = await Promise.all(
    surveys.map(async (survey) => {
      const [stats, responses] = await Promise.all([
        getSurveyStats(survey.id, survey.questions),
        getSurveyResponses(survey.id),
      ]);
      return [survey.id, { ...stats, responses }] as const;
    })
  );
  const statsMap = Object.fromEntries(statsEntries);

  return <SurveyList eventId={eventId} surveys={surveys} statsMap={statsMap} />;
}
