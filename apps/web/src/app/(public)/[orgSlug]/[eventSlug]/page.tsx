import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, ExternalLink } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { buttonVariants } from "@/shared/components/ui";

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-primary/8 via-primary/3 to-transparent py-16">
        {event.cover_image && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={event.cover_image}
              alt=""
              className="h-full w-full object-cover opacity-20"
            />
          </div>
        )}
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <p className="text-sm font-medium text-primary">{org.name}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            {event.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(event.start_date).toLocaleDateString()} -{" "}
              {new Date(event.end_date).toLocaleDateString()}
            </span>
            {event.venue_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venue_name}
              </span>
            )}
            {event.is_virtual && (
              <span className="flex items-center gap-1">
                <ExternalLink className="h-4 w-4" />
                Virtual Event
              </span>
            )}
          </div>
          <Link
            href={`/${orgSlug}/${eventSlug}/register`}
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            Register Now
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        {event.description && (
          <div>
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            href={`/${orgSlug}/${eventSlug}/schedule`}
            className={buttonVariants({ variant: "outline" })}
          >
            View Schedule
          </Link>
          <Link
            href={`/${orgSlug}/${eventSlug}/speakers`}
            className={buttonVariants({ variant: "outline" })}
          >
            View Speakers
          </Link>
        </div>
      </div>
    </div>
  );
}
