"use client";

import { useEffect } from "react";
import { createClient } from "@attendly/ui/supabase/client";

/**
 * Client component that marks unread announcements as read
 * when the notifications page is viewed.
 */
export function MarkAnnouncementsRead({
  unreadIds,
  userId,
}: {
  unreadIds: string[];
  userId: string;
}) {
  useEffect(() => {
    if (unreadIds.length === 0) return;

    const supabase = createClient();

    async function markRead() {
      const rows = unreadIds.map((id) => ({
        announcement_id: id,
        user_id: userId,
      }));

      await supabase.from("announcement_reads").upsert(rows, {
        onConflict: "announcement_id,user_id",
        ignoreDuplicates: true,
      });
    }

    markRead();
  }, [unreadIds, userId]);

  return null;
}
