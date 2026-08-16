import { getLogisticsItems } from "@/features/logistics/queries";
import { LogisticsEditor } from "@/features/logistics/components/logistics-editor";

export default async function LogisticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const items = await getLogisticsItems(eventId);
  return <LogisticsEditor eventId={eventId} items={items} />;
}
