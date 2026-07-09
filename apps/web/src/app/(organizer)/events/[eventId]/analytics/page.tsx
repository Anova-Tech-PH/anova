import { getEventAnalytics } from "@/features/dashboard/analytics-queries";
import { AnalyticsCharts } from "@/features/dashboard/components/analytics-charts";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const data = await getEventAnalytics(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Event performance and registration analytics.
        </p>
      </div>

      <AnalyticsCharts data={data} />
    </div>
  );
}
