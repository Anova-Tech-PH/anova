import { EventSidebar } from "./event-sidebar";
import { EventHeaderBar } from "./event-header-bar";
import { createClient } from "@attendly/ui/supabase/server";

export default async function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Fetch org first to get org ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, end_date, venue_name, timezone, is_virtual")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  return (
    <div className="min-h-screen lg:flex">
      <EventSidebar params={params} />
      <div className="flex-1 min-w-0 flex flex-col">
        {event && <EventHeaderBar event={event} />}
        <main className="flex-1 min-w-0 pt-[57px] lg:pt-0">{children}</main>
      </div>
    </div>
  );
}
