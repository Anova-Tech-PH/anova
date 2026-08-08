import { createClient } from "@attendly/ui/supabase/server";
import { redirect } from "next/navigation";
import { DoorMode } from "./door-mode";

export default async function DoorPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) redirect("/dashboard");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, start_time, end_time, location")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time");

  return (
    <DoorMode
      eventId={eventId}
      eventTitle={event.title}
      sessions={sessions ?? []}
    />
  );
}
