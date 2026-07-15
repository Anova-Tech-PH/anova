import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Wifi, Shield } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/shared/utils/supabase/server";
import { RegistrationFlow } from "./registration-flow";

export default async function RegisterPage({
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
    .select("id, title, start_date, end_date, venue_name, is_virtual")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order");

  // Get sold counts
  const { data: regCounts } = await supabase
    .from("registrations")
    .select("ticket_type_id")
    .eq("event_id", event.id)
    .in("status", ["confirmed", "checked_in"]);

  const countMap: Record<string, number> = {};
  for (const r of regCounts ?? []) {
    countMap[r.ticket_type_id] = (countMap[r.ticket_type_id] ?? 0) + 1;
  }

  const ticketsWithAvailability = (ticketTypes ?? []).map((t) => ({
    ...t,
    sold: countMap[t.id] ?? 0,
    available: t.quantity ? t.quantity - (countMap[t.id] ?? 0) : null,
  }));

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateStr = startDate.toDateString() === endDate.toDateString()
    ? startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link
        href={`/${orgSlug}/${eventSlug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      {/* Event summary card */}
      <div className="mb-8 rounded-xl border bg-gradient-to-br from-primary/[0.04] to-transparent p-5">
        <h1 className="text-xl font-semibold">{event.title}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {dateStr}
          </span>
          {event.venue_name && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {event.venue_name}
            </span>
          )}
          {event.is_virtual && (
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-primary" />
              Virtual Event
            </span>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold">Select your ticket</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a ticket type and complete your registration.
      </p>

      {ticketsWithAvailability.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
          Registration is not available yet.
        </div>
      ) : (
        <RegistrationFlow
          eventId={event.id}
          tickets={ticketsWithAvailability}
        />
      )}

      {/* Trust signal */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <Shield className="h-3.5 w-3.5" />
        Secure registration powered by Anova
      </div>
    </div>
  );
}
