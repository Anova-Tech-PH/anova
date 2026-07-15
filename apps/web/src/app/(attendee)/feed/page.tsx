import { redirect } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getPostsByEvent } from "@/features/social/queries";
import { ActivityFeed } from "@/features/social/components/activity-feed";
import { EmptyState } from "@/shared/components/ui/empty-state";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: eventId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's registered events
  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id, events(id, title)")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "checked_in"]);

  const allEvents = registrations?.map((r) => r.events).flat().filter(Boolean) ?? [];
  const seen = new Set<string>();
  const events = allEvents.filter((e: any) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  const selectedEventId = eventId ?? (events[0] as any)?.id;

  if (!selectedEventId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Activity Feed</h1>
        <EmptyState title="Register for an event to see and create posts." />
      </div>
    );
  }

  const posts = await getPostsByEvent(selectedEventId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Activity Feed</h1>
        {events.length > 1 && (
          <select
            name="event"
            defaultValue={selectedEventId}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            {events.map((evt: any) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <ActivityFeed
        eventId={selectedEventId}
        initialPosts={posts}
        currentUserId={user.id}
      />
    </div>
  );
}
