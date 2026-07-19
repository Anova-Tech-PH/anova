import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { Card } from "@/shared/components/ui";
import { BookOpen, MapPin, Globe, Clock, Link, ExternalLink } from "lucide-react";
import { CopyLinkButton } from "./copy-link-button";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  return (
    <div className="relative space-y-6">
      {/* Decorative background grid */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.445 0.107 195) 1px, transparent 1px), linear-gradient(90deg, oklch(0.445 0.107 195) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {event.description && (
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              About
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card to-[oklch(0.445_0.107_195_/_0.03)]">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-[oklch(0.445_0.107_195)] to-[oklch(0.445_0.107_195_/_0.1)]" />
          <div className="flex items-center gap-2">
            {event.is_virtual ? (
              <Globe className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
            ) : (
              <MapPin className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
            )}
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Venue
            </p>
          </div>
          <p className="mt-2 text-lg font-semibold">
            {event.is_virtual
              ? "Virtual Event"
              : event.venue_name || "Not set"}
          </p>
        </Card>

        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card to-[oklch(0.445_0.107_195_/_0.03)]">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-[oklch(0.445_0.107_195)] to-[oklch(0.445_0.107_195_/_0.1)]" />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timezone
            </p>
          </div>
          <p className="mt-2 text-lg font-semibold">{event.timezone}</p>
        </Card>

        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card to-[oklch(0.445_0.107_195_/_0.03)]">
          <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-[oklch(0.445_0.107_195)] to-[oklch(0.445_0.107_195_/_0.1)]" />
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Slug
            </p>
          </div>
          <p className="mt-2 text-lg font-semibold">{event.slug}</p>
        </Card>
      </div>

      {event.organizations && (
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Public Registration Link
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              {`/${(event.organizations as any).slug}/${event.slug}/register`}
            </code>
            <CopyLinkButton path={`/${(event.organizations as any).slug}/${event.slug}/register`} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share this link with attendees to register for your event.
          </p>
        </Card>
      )}
    </div>
  );
}
