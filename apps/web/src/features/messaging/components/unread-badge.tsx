"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/shared/utils/supabase/client";

export function UnreadBadge({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get conversations the user is a member of
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) {
        setCount(0);
        return;
      }

      let total = 0;
      for (const m of memberships) {
        if (m.last_read_at) {
          const { count: c } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", m.conversation_id)
            .neq("sender_id", user.id)
            .gt("created_at", m.last_read_at);
          total += c ?? 0;
        }
      }

      setCount(total);
    }

    fetchUnread();
  }, []);

  if (count === 0) return null;

  return (
    <span className={className}>
      {count}
    </span>
  );
}
