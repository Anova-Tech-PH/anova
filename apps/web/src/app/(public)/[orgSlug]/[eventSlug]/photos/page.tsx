import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { AuthGuard } from "../auth-guard";
import { getPhotos } from "@/features/photos/queries";
import { getPhotoCount } from "@/features/photos/queries";
import { PhotoGallery } from "@/features/photos/components/photo-gallery";

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();
  if (!event) notFound();

  const currentPath = `/${orgSlug}/${eventSlug}/photos`;

  return (
    <AuthGuard
      currentPath={currentPath}
      title="Sign in to view photos"
      description="Sign in to view, share, and like event photos."
    >
      <PhotosContent eventId={event.id} />
    </AuthGuard>
  );
}

async function PhotosContent({ eventId }: { eventId: string }) {
  const [{ photos, total }, counts] = await Promise.all([
    getPhotos(eventId),
    getPhotoCount(eventId),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PhotoGallery
        eventId={eventId}
        initialPhotos={photos as Parameters<typeof PhotoGallery>[0]["initialPhotos"]}
        initialTotal={total}
        counts={counts}
      />
    </div>
  );
}
