import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link
        href={`/${orgSlug}/${eventSlug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <h1 className="text-2xl font-semibold">Register for {event.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {new Date(event.start_date).toLocaleDateString()} -{" "}
        {new Date(event.end_date).toLocaleDateString()}
        {event.venue_name && ` · ${event.venue_name}`}
      </p>

      {ticketsWithAvailability.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          Registration is not available yet.
        </div>
      ) : (
        <RegistrationFlow
          eventId={event.id}
          tickets={ticketsWithAvailability}
        />
      )}
    </div>
  );
}
