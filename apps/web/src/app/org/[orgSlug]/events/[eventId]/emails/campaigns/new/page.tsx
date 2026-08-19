import { createClient } from "@attendly/ui/supabase/server";
import { getContactLists, getCampaigns } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { CampaignComposer } from "@/features/emails/components/campaign-composer";
import { notFound } from "next/navigation";

export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("title, start_date, venue_name, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) {
    console.error("[NewCampaignPage] Event not found:", eventId, error);
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgs = event.organizations as unknown as { slug: string }[] | null;
  const orgSlug = orgs?.[0]?.slug ?? "";

  const [contactLists, ticketTypes, pastCampaigns] = await Promise.all([
    getContactLists(event.organization_id),
    getTicketTypesByEvent(eventId),
    getCampaigns(eventId),
  ]);

  return (
    <CampaignComposer
      eventId={eventId}
      eventName={event.title}
      eventDate={new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      eventLocation={event.venue_name}
      eventUrl={`/register/${orgSlug}/${event.slug}`}
      contactLists={contactLists}
      ticketTypes={ticketTypes}
      pastCampaigns={pastCampaigns.filter((c: any) => c.status === "sent")}
      initial={null}
      userEmail={user?.email ?? undefined}
    />
  );
}
