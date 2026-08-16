"use client";

import { useState, useEffect } from "react";
import { Trophy, PartyPopper } from "lucide-react";
import { Avatar } from "@attendly/ui/components";
import { createClient } from "@attendly/ui/supabase/client";
import type { LeaderboardEntry } from "@/features/gamification/queries";
import { toggleCongratulation } from "../congratulation-actions";

export function LeaderboardFull({
  entries: initialEntries,
  currentUserId,
  userRank,
  userPoints,
  title,
  eventId,
  congratulationCounts: initialCounts,
  userCongratulations: initialUserCongs,
  hideOrganizers,
}: {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  userRank: number | null;
  userPoints: number | null;
  title: string;
  eventId: string;
  congratulationCounts?: Record<string, number>;
  userCongratulations?: string[];
  hideOrganizers?: boolean;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [congratsCounts, setCongratsCounts] = useState<Record<string, number>>(
    initialCounts ?? {}
  );
  const [congratulatedSet, setCongratulatedSet] = useState(
    new Set(initialUserCongs ?? [])
  );

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

  async function handleCongratulate(toUserId: string) {
    const wasCongratulated = congratulatedSet.has(toUserId);

    // Optimistic update
    setCongratulatedSet((prev) => {
      const next = new Set(prev);
      if (wasCongratulated) next.delete(toUserId);
      else next.add(toUserId);
      return next;
    });
    setCongratsCounts((prev) => ({
      ...prev,
      [toUserId]: (prev[toUserId] ?? 0) + (wasCongratulated ? -1 : 1),
    }));

    try {
      await toggleCongratulation(eventId, toUserId);
    } catch {
      // Revert on error
      setCongratulatedSet((prev) => {
        const next = new Set(prev);
        if (wasCongratulated) next.add(toUserId);
        else next.delete(toUserId);
        return next;
      });
      setCongratsCounts((prev) => ({
        ...prev,
        [toUserId]: (prev[toUserId] ?? 0) + (wasCongratulated ? 1 : -1),
      }));
    }
  }

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

      {hideOrganizers && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
          Organizers will not show up on the leaderboard
        </div>
      )}

      {currentUserId && userRank && (
        <div className="rounded-xl border border-[oklch(0.445_0.107_195)]/30 bg-[oklch(0.445_0.107_195)]/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Your rank:</span>
            <span className="text-lg font-bold text-[oklch(0.445_0.107_195)]">#{userRank}</span>
          </div>
          <span className="text-sm font-semibold">{userPoints ?? 0} pts</span>
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Congratulate the most active members of our community!
        </p>
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
                <Avatar src={entry.avatar_url} name={entry.full_name} size="sm" />
                <span className="flex-1 text-sm truncate">
                  {entry.full_name ?? "Anonymous"}
                  {isMe && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                </span>
                <span className="text-sm font-semibold transition-all duration-300">{entry.total_points} pts</span>
                {currentUserId && !isMe && (
                  <button
                    onClick={() => handleCongratulate(entry.user_id)}
                    className={`ml-2 flex items-center gap-1 text-xs transition-colors ${
                      congratulatedSet.has(entry.user_id)
                        ? "text-[oklch(0.445_0.107_195)]"
                        : "text-muted-foreground hover:text-[oklch(0.445_0.107_195)]"
                    }`}
                  >
                    <PartyPopper className="h-3.5 w-3.5" />
                    <span>
                      {congratulatedSet.has(entry.user_id) ? "Congratulated" : "Congratulate"}
                      {(congratsCounts[entry.user_id] ?? 0) > 0 &&
                        ` (${congratsCounts[entry.user_id]})`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
