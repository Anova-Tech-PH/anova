import { getSurveysByEvent, getSurveyStats } from "@/features/surveys/queries";
import { SurveyList } from "@/features/surveys/components/survey-list";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const surveys = await getSurveysByEvent(eventId);

  // Fetch stats for all surveys in parallel
  const statsEntries = await Promise.all(
    surveys.map(async (survey) => {
      const stats = await getSurveyStats(survey.id, survey.questions);
      return [survey.id, stats] as const;
    })
  );
  const statsMap = Object.fromEntries(statsEntries);

  return <SurveyList eventId={eventId} surveys={surveys} statsMap={statsMap} />;
}
