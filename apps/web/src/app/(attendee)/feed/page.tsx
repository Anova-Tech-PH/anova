import { redirect } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getPostsByEvent } from "@/features/social/queries";
import { ActivityFeed } from "@/features/social/components/activity-feed";

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

  const events = registrations?.map((r) => r.events).filter(Boolean) ?? [];
  const selectedEventId = eventId ?? (events[0] as any)?.id;

  if (!selectedEventId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Activity Feed</h1>
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          Register for an event to see and create posts.
        </div>
      </div>
    );
  }

  const posts = await getPostsByEvent(selectedEventId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Activity Feed</h1>
        {events.length > 1 && (
          <form>
            <select
              name="event"
              defaultValue={selectedEventId}
              onChange={(e) => {
                const url = new URL(window.location.href);
                url.searchParams.set("event", e.target.value);
                window.location.href = url.toString();
              }}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm"
            >
              {events.map((evt: any) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </form>
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
