import Link from "next/link";
import { ArrowLeft, ExternalLink, ScanLine } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge, Button } from "@attendly/ui/components";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, status, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const isLive = event.status === "published";
  const orgSlug = (event as any).organizations?.slug;
  const publicUrl = orgSlug ? `/${orgSlug}/${event.slug}` : null;

  return (
    <div className="-mx-4 -mt-5 lg:-mx-7 lg:-mt-7">
      {/* Event sub-header — ink bar */}
      <div className="flex h-[52px] items-center gap-4 border-b border-white/[0.12] bg-ink px-4 lg:px-6">
        <Link href="/events" className="text-white/60 hover:text-white/90 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-[14px] font-bold text-white truncate">{event.title}</span>
        {isLive && <Badge variant="live" className="ml-1 shrink-0">Live</Badge>}

        <div className="ml-auto flex items-center gap-3">
          {publicUrl && (
            <Link
              href={publicUrl}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 rounded-[6px] border border-white/[0.22] px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:text-white hover:border-white/[0.35] transition-colors"
            >
              Public page
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link href={`/door/${eventId}`}>
            <Button size="sm" className="gap-1.5">
              <ScanLine className="h-3.5 w-3.5" />
              Open door mode
            </Button>
          </Link>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
