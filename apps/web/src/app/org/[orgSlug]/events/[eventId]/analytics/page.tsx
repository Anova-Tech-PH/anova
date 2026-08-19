import { getEventAnalytics } from "@/features/dashboard/analytics-queries";
import { getEventRevenue } from "@/features/dashboard/revenue-queries";
import { AnalyticsCharts } from "@/features/dashboard/components/analytics-charts";
import { RevenueCharts } from "@/features/dashboard/components/revenue-charts";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [data, revenueData] = await Promise.all([
    getEventAnalytics(eventId),
    getEventRevenue(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Event performance and registration analytics.
        </p>
      </div>

      {revenueData.hasPaidTickets && <RevenueCharts data={revenueData} />}

      <AnalyticsCharts data={data} />
    </div>
  );
}
