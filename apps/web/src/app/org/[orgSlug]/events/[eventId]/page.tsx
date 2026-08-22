import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { BasicsForm } from "./basics-form";
import { JoinCodeCard } from "./join-code-card";

export default async function EventBasicsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  return (
    <div className="space-y-6">
      {event.join_code && <JoinCodeCard joinCode={event.join_code} />}
      <BasicsForm event={event} />
    </div>
  );
}
