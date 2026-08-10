import { redirect } from "next/navigation";
import { Bell, Calendar } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { EmptyState } from "@attendly/ui/components";
import { MarkAnnouncementsRead } from "./mark-read";

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's registered event IDs
  const { data: registrations } = await supabase
    .from("registrations")
    .select("event_id, events(title)")
    .eq("user_id", user.id)
    .in("status", ["confirmed", "checked_in"]);

  const eventIds = [
    ...new Set((registrations ?? []).map((r) => r.event_id)),
  ];

  // Build event title map
  const eventTitleMap: Record<string, string> = {};
  for (const r of registrations ?? []) {
    const event = r.events as any;
    if (event?.title) {
      eventTitleMap[r.event_id] = event.title;
    }
  }

  // Fetch sent announcements for those events
  let announcements: any[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from("announcements")
      .select("id, event_id, subject, body, sent_at, created_at")
      .in("event_id", eventIds)
      .eq("status", "sent")
      .order("sent_at", { ascending: false });
    announcements = data ?? [];
  }

  // Fetch announcement reads for this user
  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id);

  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  const unreadIds = announcements
    .filter((a) => !readIds.has(a.id))
    .map((a) => a.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Announcements from your events
        </p>
      </div>

      {/* Mark unread announcements as read on view */}
      <MarkAnnouncementsRead unreadIds={unreadIds} userId={user.id} />

      {announcements.length === 0 ? (
        <EmptyState title="No notifications yet" />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => {
            const isUnread = !readIds.has(announcement.id);
            const eventTitle = eventTitleMap[announcement.event_id];

            return (
              <div
                key={announcement.id}
                className={`relative rounded-xl border p-4 transition-colors ${
                  isUnread
                    ? "border-primary/20 bg-primary/[0.03]"
                    : "bg-card"
                }`}
              >
                {/* Unread dot */}
                {isUnread && (
                  <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-blue-500" />
                )}

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bell className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-sm leading-tight ${
                        isUnread ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {announcement.subject}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {announcement.body}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {timeAgo(announcement.sent_at ?? announcement.created_at)}
                      </span>
                      {eventTitle && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {eventTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
