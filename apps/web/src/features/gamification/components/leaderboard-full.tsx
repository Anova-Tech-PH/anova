"use client";

import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import type { LeaderboardEntry } from "@/features/gamification/queries";

export function LeaderboardFull({
  entries: initialEntries,
  currentUserId,
  userRank,
  userPoints,
  title,
  eventId,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  userRank: number | null;
  userPoints: number | null;
  title: string;
  eventId: string;
}) {
  const [entries, setEntries] = useState(initialEntries);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`leaderboard:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaderboard_scores",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const row = payload.new as {
              user_id: string;
              total_points: number;
            };
            setEntries((prev) => {
              const idx = prev.findIndex((e) => e.user_id === row.user_id);
              let updated = [...prev];
              if (idx >= 0) {
                updated[idx] = {
                  ...updated[idx],
                  total_points: row.total_points,
                };
              } else {
                updated.push({
                  user_id: row.user_id,
                  total_points: row.total_points,
                  challenges_completed: 0,
                  last_activity_at: null,
                  rank: prev.length + 1,
                  full_name: null,
                  avatar_url: null,
                });
              }
              updated.sort((a, b) => b.total_points - a.total_points);
              return updated.map((e, i) => ({ ...e, rank: i + 1 }));
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        {title}
        <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-green-600">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </h2>

      {currentUserId && userRank && (
        <div className="rounded-xl border border-[oklch(0.445_0.107_195)]/30 bg-[oklch(0.445_0.107_195)]/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Your rank:</span>
            <span className="text-lg font-bold text-[oklch(0.445_0.107_195)]">#{userRank}</span>
          </div>
          <span className="text-sm font-semibold">{userPoints ?? 0} pts</span>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first on the leaderboard! Earn points by engaging with the event.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border divide-y">
          {entries.map((entry) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  isMe ? "bg-[oklch(0.445_0.107_195)]/5" : ""
                }`}
              >
                <span className="w-8 text-center text-sm font-medium">
                  {entry.rank <= 3 ? ["\u{1F947}", "\u{1F948}", "\u{1F949}"][entry.rank - 1] : entry.rank}
                </span>
                <span className="flex-1 text-sm truncate">
                  {entry.full_name ?? "Anonymous"}
                  {isMe && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                </span>
                <span className="text-sm font-semibold transition-all duration-300">{entry.total_points} pts</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
