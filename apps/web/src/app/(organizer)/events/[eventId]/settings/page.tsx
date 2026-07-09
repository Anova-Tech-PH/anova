import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { EventSettingsForm } from "./settings-form";

export default async function EventSettingsPage({
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
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Event configuration and management.
        </p>
      </div>

      <EventSettingsForm event={event} />
    </div>
  );
}
