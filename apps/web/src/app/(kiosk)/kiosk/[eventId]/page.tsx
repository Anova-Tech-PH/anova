import { createClient } from "@attendly/ui/supabase/server";
import { KioskMode } from "@/features/registration/components/kiosk-mode";
import { notFound } from "next/navigation";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, start_time")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time");

  if (!sessions || sessions.length === 0) notFound();

  return <KioskMode eventId={eventId} eventTitle={event.title} sessions={sessions} />;
}
