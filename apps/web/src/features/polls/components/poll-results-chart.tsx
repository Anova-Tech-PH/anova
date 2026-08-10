"use client";

import type { PollOption } from "@/features/polls/queries";

export function PollResultsChart({
  options,
  voteCounts,
  totalVotes,
}: {
  options: PollOption[];
  voteCounts: Record<string, number>;
  totalVotes: number;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const count = voteCounts[opt.id] ?? 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{opt.text}</span>
              <span className="text-muted-foreground">
                {count} vote{count !== 1 ? "s" : ""} ({pct}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-foreground/80 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {totalVotes === 0 && (
        <p className="text-sm text-muted-foreground">No votes yet.</p>
      )}
    </div>
  );
}
