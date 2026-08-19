import { getWebsiteConfig } from "@/features/website/queries";
import { WebsiteEditor } from "@/features/website/components/website-editor";
import { createClient } from "@attendly/ui/supabase/server";

export default async function WebsiteBuilderPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [config, supabase] = await Promise.all([
    getWebsiteConfig(eventId),
    createClient(),
  ]);

  const { data: event } = await supabase
    .from("events")
    .select("slug, organizations:organization_id(slug)")
    .eq("id", eventId)
    .single();

  const orgs = event?.organizations as { slug: string } | { slug: string }[] | null;
  const orgSlug = Array.isArray(orgs)
    ? orgs[0]?.slug
    : orgs?.slug;
  const previewUrl = orgSlug && event?.slug ? `/${orgSlug}/${event.slug}/website` : undefined;

  return <WebsiteEditor eventId={eventId} initialConfig={config} previewUrl={previewUrl} />;
}
