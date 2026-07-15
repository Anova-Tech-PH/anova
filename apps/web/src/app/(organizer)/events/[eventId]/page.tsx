import { notFound } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { Card } from "@/shared/components/ui";

export default async function EventDetailPage({
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
      {event.description && (
        <Card className="p-6">
          <h2 className="mb-2 font-medium">About</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Venue</p>
          <p className="mt-1 font-medium">
            {event.is_virtual
              ? "Virtual Event"
              : event.venue_name || "Not set"}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Timezone</p>
          <p className="mt-1 font-medium">{event.timezone}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Slug</p>
          <p className="mt-1 font-medium">{event.slug}</p>
        </Card>
      </div>
    </div>
  );
}
