import { createClient } from "@attendly/ui/supabase/server";
import { getCampaignById, getContactLists, getCampaigns } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { CampaignComposer } from "@/features/emails/components/campaign-composer";
import { notFound } from "next/navigation";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ eventId: string; id: string }>;
}) {
  const { eventId, id } = await params;
  const supabase = await createClient();

  const [campaign, eventResult] = await Promise.all([
    getCampaignById(id).catch(() => null),
    supabase
      .from("events")
      .select("title, start_date, location, slug, organization_id, organizations(slug)")
      .eq("id", eventId)
      .single(),
  ]);

  const event = eventResult.data;
  if (!campaign || !event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

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
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })}
      eventLocation={event.location}
      eventUrl={`/${orgSlug}/${event.slug}/register`}
      contactLists={contactLists}
      ticketTypes={ticketTypes}
      pastCampaigns={pastCampaigns.filter((c: any) => c.status === "sent" && c.id !== id)}
      initial={campaign}
      userEmail={user?.email ?? undefined}
    />
  );
}
