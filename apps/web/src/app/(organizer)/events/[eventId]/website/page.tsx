import { getWebsiteConfig } from "@/features/website/queries";
import { WebsiteEditor } from "@/features/website/components/website-editor";

export default async function WebsiteBuilderPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const config = await getWebsiteConfig(eventId);

  return <WebsiteEditor eventId={eventId} initialConfig={config} />;
}
