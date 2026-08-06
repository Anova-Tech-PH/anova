import { redirect } from "next/navigation";
import { CalendarHeart, Clock, MapPin } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { getMyBookmarkedSessions } from "@/features/attendee/queries";
import { Card, Avatar } from "@attendly/ui/components";
import { RemoveBookmarkButton } from "./remove-bookmark-button";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MySchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my/schedule");

  const bookmarks = await getMyBookmarkedSessions(user.id);

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">My Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sessions you've saved.</p>
        <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <CalendarHeart className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No saved sessions</p>
          <p className="text-sm">Browse an event's schedule and bookmark sessions to see them here.</p>
        </div>
      </div>
    );
  }

  // Group by event
  const byEvent: Record<string, { eventTitle: string; sessions: typeof bookmarks }> = {};
  for (const b of bookmarks) {
    const s = b.sessions as any;
    if (!s?.events) continue;
    const key = s.events.id;
    if (!byEvent[key]) {
      byEvent[key] = {
        eventTitle: s.events.title,
        sessions: [],
      };
    }
    byEvent[key].sessions.push(b);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Schedule</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sessions you've saved.</p>

      <div className="mt-6 space-y-8">
        {Object.entries(byEvent).map(([eventId, group]) => (
          <div key={eventId}>
            <h2 className="mb-3 text-lg font-medium">{group.eventTitle}</h2>
            <div className="space-y-3">
              {group.sessions.map((b) => {
                const s = b.sessions as any;
                return (
                  <Card key={b.session_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{s.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(s.start_time)} - {formatTime(s.end_time)}
                          </span>
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {s.location}
                            </span>
                          )}
                        </div>
                        {s.session_speakers?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.session_speakers.map(({ speakers: sp }: any) => (
                              <div key={sp.id} className="flex items-center gap-1.5">
                                <Avatar src={sp.photo} name={sp.name} size="sm" className="h-5 w-5" />
                                <span className="text-xs">{sp.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <RemoveBookmarkButton sessionId={b.session_id} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
