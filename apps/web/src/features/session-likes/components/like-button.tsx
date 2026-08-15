"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleSessionLike } from "@/features/session-likes/actions";

export function LikeButton({
  sessionId,
  initialLiked,
  initialCount,
}: {
  sessionId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    // Optimistic update
    setLiked(!liked);
    setCount((c) => (liked ? Math.max(0, c - 1) : c + 1));

    try {
      await toggleSessionLike(sessionId);
    } catch {
      // Revert on error
      setLiked(liked);
      setCount(count);
      toast.error("Sign in to like sessions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors"
    >
      <Heart
        className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : ""}`}
      />
      <span>
        {count} {count === 1 ? "Like" : "Likes"}
      </span>
    </button>
  );
}
