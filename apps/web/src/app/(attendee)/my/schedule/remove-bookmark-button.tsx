"use client";

import { X } from "lucide-react";
import { toast } from "sonner";
import { toggleSessionBookmark } from "@/features/attendee/actions";

export function RemoveBookmarkButton({ sessionId }: { sessionId: string }) {
  async function handleRemove() {
    try {
      await toggleSessionBookmark(sessionId);
      toast.success("Session removed from schedule");
    } catch {
      toast.error("Failed to remove session");
    }
  }

  return (
    <button
      onClick={handleRemove}
      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Remove from schedule"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
