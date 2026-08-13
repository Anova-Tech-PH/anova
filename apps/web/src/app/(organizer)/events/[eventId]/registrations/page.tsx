import { getAttendees, getAttendeeCategories, getAttendeeStats } from "@/features/registration/attendees-queries";
import { AttendeesTable } from "@/features/registration/components/attendees-table";

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const { eventId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 10;

  const [{ data: attendees, total }, categories, stats] = await Promise.all([
    getAttendees(eventId, {
      page,
      pageSize,
      category: sp.category,
      search: sp.search,
    }),
    getAttendeeCategories(eventId),
    getAttendeeStats(eventId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendees</h1>
        <p className="text-sm text-muted-foreground">
          View and manage event attendees.
        </p>
      </div>

      <AttendeesTable
        eventId={eventId}
        attendees={attendees}
        total={total}
        categories={categories}
        stats={stats}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
