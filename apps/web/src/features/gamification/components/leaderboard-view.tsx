"use client";

import { useState, useTransition, useEffect } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import type { LeaderboardEntry, PointTransaction } from "@/features/gamification/queries";
import { recalculateLeaderboard } from "@/features/gamification/actions";
import { getUserTransactions } from "@/features/gamification/queries";
import { AttendeePointHistory } from "./attendee-point-history";

const MEDAL: Record<number, string> = { 1: "\u{1F947}", 2: "\u{1F948}", 3: "\u{1F949}" };

export function LeaderboardView({
  eventId,
  entries: initialEntries,
}: {
  eventId: string;
  entries: LeaderboardEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`leaderboard-org:${eventId}`)
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
  const [selectedUser, setSelectedUser] = useState<{
    name: string;
    transactions: PointTransaction[];
  } | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  function handleRecalculate() {
    startTransition(async () => {
      await recalculateLeaderboard(eventId);
    });
  }

  async function handleViewHistory(entry: LeaderboardEntry) {
    setLoadingUserId(entry.user_id);
    try {
      const transactions = await getUserTransactions(eventId, entry.user_id);
      setSelectedUser({
        name: entry.full_name ?? "Unknown Attendee",
        transactions,
      });
    } finally {
      setLoadingUserId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Leaderboard
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </h2>
        <button
          onClick={handleRecalculate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <RotateCcw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          Recalculate
        </button>
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Trophy className="h-12 w-12" />
          <p className="text-sm">
            No leaderboard entries yet. Points will appear here as attendees
            participate.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 w-16">Rank</th>
                <th className="px-4 py-2">Attendee</th>
                <th className="px-4 py-2 w-24 text-right">Points</th>
                <th className="px-4 py-2 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.user_id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 text-center">
                    {MEDAL[entry.rank] ?? entry.rank}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {entry.full_name ?? "Unknown Attendee"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums transition-all duration-300">
                    {entry.total_points}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleViewHistory(entry)}
                      disabled={loadingUserId === entry.user_id}
                      className="text-sm font-medium hover:underline disabled:opacity-50"
                      style={{ color: "oklch(0.445 0.107 195)" }}
                    >
                      {loadingUserId === entry.user_id ? "Loading..." : "History"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Point history modal */}
      {selectedUser && (
        <AttendeePointHistory
          transactions={selectedUser.transactions}
          attendeeName={selectedUser.name}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
