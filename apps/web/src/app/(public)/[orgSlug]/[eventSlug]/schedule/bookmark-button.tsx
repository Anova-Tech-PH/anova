"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleSessionBookmark } from "@/features/attendee/actions";

export function BookmarkButton({
  sessionId,
  initialBookmarked,
}: {
  sessionId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const result = await toggleSessionBookmark(sessionId);
      setBookmarked(result.bookmarked);
      toast.success(result.bookmarked ? "Session saved" : "Session removed");
    } catch {
      toast.error("Sign in to save sessions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-md p-1.5 transition-colors ${
        bookmarked
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      title={bookmarked ? "Remove from schedule" : "Save to schedule"}
    >
      <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
    </button>
  );
}
