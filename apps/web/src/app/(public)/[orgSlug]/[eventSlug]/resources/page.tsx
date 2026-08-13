import { notFound } from "next/navigation";
import { FileText, Download, ExternalLink } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { VideoEmbed } from "@/features/documents/components/video-embed";

export default async function PublicResourcesPage({
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

  const { data: documents } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", event.id)
    .is("session_id", null)
    .order("sort_order");

  const files = (documents ?? []).filter((d: { type: string }) => d.type === "file");
  const videos = (documents ?? []).filter((d: { type: string }) => d.type === "video");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{event.title} — Resources</h1>

      {(!documents || documents.length === 0) ? (
        <p className="mt-6 text-muted-foreground">
          No resources have been shared yet.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {files.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Files</h2>
              <div className="space-y-3">
                {files.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{doc.title}</p>
                      {doc.file_type && (
                        <p className="text-xs text-muted-foreground">{doc.file_type}</p>
                      )}
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Videos</h2>
              <div className="space-y-6">
                {videos.map((doc) => (
                  <div key={doc.id} className="space-y-2">
                    <h3 className="font-medium">{doc.title}</h3>
                    {doc.external_url ? (
                      <VideoEmbed url={doc.external_url} title={doc.title} />
                    ) : (
                      <p className="text-sm text-muted-foreground">No video URL provided.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
