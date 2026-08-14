import { createClient } from "@attendly/ui/supabase/server";
import { IcebreakerConfig } from "@/features/community/components/icebreaker-config";

export default async function CommunitySettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: icebreaker } = await supabase
    .from("event_icebreakers")
    .select("*")
    .eq("event_id", eventId)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Community Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the icebreaker question shown to attendees when they first
          visit the community board.
        </p>
      </div>
      <IcebreakerConfig eventId={eventId} icebreaker={icebreaker} />
    </div>
  );
}
