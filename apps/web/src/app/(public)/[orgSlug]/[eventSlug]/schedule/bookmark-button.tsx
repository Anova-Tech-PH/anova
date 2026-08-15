"use client";

import { useState } from "react";
import { CalendarPlus, CalendarCheck } from "lucide-react";
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
      toast.success(
        result.bookmarked ? "Added to My Agenda" : "Removed from My Agenda"
      );
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
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        bookmarked
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-primary text-primary hover:bg-primary/10"
      }`}
      title={bookmarked ? "Remove from My Agenda" : "Add to My Agenda"}
    >
      {bookmarked ? (
        <>
          <CalendarCheck className="h-3.5 w-3.5" />
          In My Agenda
        </>
      ) : (
        <>
          <CalendarPlus className="h-3.5 w-3.5" />
          Add to My Agenda
        </>
      )}
    </button>
  );
}
