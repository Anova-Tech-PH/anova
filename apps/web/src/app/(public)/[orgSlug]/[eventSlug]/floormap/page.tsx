import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import {
  getFloormapsByEvent,
  getFloormapWithMarkers,
} from "@/features/floormap/queries";
import { FloormapViewer } from "@/features/floormap/components/floormap-viewer";

export default async function PublicFloormapPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ map?: string; highlight?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const { map, highlight } = await searchParams;
  const supabase = await createClient();

  // Resolve org from slug
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  // Resolve event from org + slug
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const floormaps = await getFloormapsByEvent(event.id);
  if (floormaps.length === 0) notFound();

  const targetId = map ?? floormaps[0].id;
  const floormap = await getFloormapWithMarkers(targetId);
  if (!floormap) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold">Floor Maps</h1>

      {floormaps.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {floormaps.map((fm) => (
            <a
              key={fm.id}
              href={`/${orgSlug}/${eventSlug}/floormap?map=${fm.id}`}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                fm.id === targetId
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {fm.name}
            </a>
          ))}
        </div>
      )}

      <FloormapViewer floormap={floormap} highlightLabel={highlight} />
    </div>
  );
}
