"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { cn } from "@attendly/ui/cn";

export function NotificationBell({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUnread() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get event IDs the user is registered for
      const { data: registrations } = await supabase
        .from("registrations")
        .select("event_id")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "checked_in"]);

      const eventIds = [
        ...new Set((registrations ?? []).map((r) => r.event_id)),
      ];
      if (eventIds.length === 0) return;

      // Get sent announcements for those events
      const { data: announcements } = await supabase
        .from("announcements")
        .select("id")
        .in("event_id", eventIds)
        .eq("status", "sent");

      if (!announcements || announcements.length === 0) return;

      // Get reads
      const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
      setCount(announcements.filter((a) => !readIds.has(a.id)).length);
    }

    fetchUnread();
  }, []);

  return (
    <Link
      href="/notifications"
      className={cn("relative inline-flex items-center justify-center", className)}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
