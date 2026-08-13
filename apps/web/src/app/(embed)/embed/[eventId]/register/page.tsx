import { notFound } from "next/navigation";
import { Calendar, MapPin, Wifi } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { parseEmbedParams, isToggleOn } from "../parse-embed-params";
import { PoweredByFooter } from "../powered-by-footer";
import { RegistrationFlow } from "@/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow";
import { getCustomFieldsByEvent } from "@/features/custom-fields/queries";

export default async function RegisterEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const rawSearchParams = await searchParams;
  const embedParams = parseEmbedParams(rawSearchParams);
  const intentId = rawSearchParams?.intent as string | undefined;

  const showEventInfo = isToggleOn(embedParams, "showEventInfo");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, slug, start_date, end_date, venue_name, is_virtual, organizations(slug)"
    )
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  // Get ticket types
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order");

  // Get sold counts for availability
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

  const customFields = await getCustomFieldsByEvent(event.id);

  let initialIntent: {
    ticket_type_id: string;
    email: string;
    name?: string;
    custom_fields?: Record<string, string | boolean>;
  } | undefined;

  if (intentId) {
    const { data: intent } = await supabase
      .from("registration_intents")
      .select("ticket_type_id, email, name, custom_fields")
      .eq("id", intentId)
      .eq("status", "pending")
      .single();

    if (intent) {
      initialIntent = {
        ticket_type_id: intent.ticket_type_id,
        email: intent.email,
        name: intent.name ?? undefined,
        custom_fields: (intent.custom_fields as Record<string, string | boolean>) ?? undefined,
      };
    }
  }

  // Build event URL for PoweredByFooter
  const orgSlug = (event as any).organizations?.slug;
  const eventUrl =
    orgSlug && event.slug ? `/${orgSlug}/${event.slug}/register` : undefined;

  // Format date range
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateStr =
    startDate.toDateString() === endDate.toDateString()
      ? startDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="mx-auto max-w-lg p-4">
      {showEventInfo && (
        <div className="mb-6 rounded-xl border bg-gradient-to-br from-primary/[0.04] to-transparent p-4">
          <h1 className="text-lg font-semibold">{event.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
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
      )}

      {ticketsWithAvailability.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
          Registration is not available yet.
        </div>
      ) : (
        <RegistrationFlow
          eventId={event.id}
          tickets={ticketsWithAvailability}
          customFields={customFields}
          initialIntent={initialIntent}
        />
      )}

      <PoweredByFooter eventUrl={eventUrl} />
    </div>
  );
}
