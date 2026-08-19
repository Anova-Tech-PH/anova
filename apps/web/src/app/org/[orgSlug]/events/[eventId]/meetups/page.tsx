import { getMeetups } from "@/features/meetups/queries";
import { MeetupsPageClient } from "@/features/meetups/components/meetups-page-client";

export default async function MeetupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const sp = await searchParams;
  const page = Number(sp?.page ?? 1);
  const pageSize = 20;

  const { meetups, total } = await getMeetups(eventId, { page, pageSize });

  return (
    <MeetupsPageClient
      eventId={eventId}
      meetups={meetups}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  );
}
