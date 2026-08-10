"use client";

import { useState } from "react";
import { toast } from "sonner";
import { votePoll } from "@/features/polls/actions";
import type { PollWithResults } from "@/features/polls/queries";

export function SessionPollCard({
  poll,
  userVote,
}: {
  poll: PollWithResults;
  userVote: string | null;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(userVote);
  const [voteCounts, setVoteCounts] = useState(poll.vote_counts);
  const [totalVotes, setTotalVotes] = useState(poll.total_votes);
  const [loading, setLoading] = useState(false);

  const hasVoted = selectedOption !== null;
  const showResults = hasVoted || poll.show_results;
  const isClosed = poll.status === "closed";

  async function handleVote(optionId: string) {
    if (isClosed || loading) return;
    setLoading(true);
    try {
      await votePoll(poll.id, optionId);

      // Update local state
      const newCounts = { ...voteCounts };
      if (selectedOption) {
        // Changing vote
        newCounts[selectedOption] = Math.max(0, (newCounts[selectedOption] ?? 0) - 1);
        newCounts[optionId] = (newCounts[optionId] ?? 0) + 1;
      } else {
        // New vote
        newCounts[optionId] = (newCounts[optionId] ?? 0) + 1;
        setTotalVotes((t) => t + 1);
      }
      setVoteCounts(newCounts);
      setSelectedOption(optionId);
      toast.success("Vote recorded!");
    } catch {
      toast.error("Sign in to vote");
    } finally {
      setLoading(false);
    }
  }

  const currentTotal = Object.values(voteCounts).reduce((a, b) => a + b, 0) || totalVotes;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{poll.question}</h4>
        {isClosed && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Poll closed
          </span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const count = voteCounts[option.id] ?? 0;
          const pct = currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0;
          const isSelected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isClosed || loading}
              className={`relative w-full rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                isSelected
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              {showResults && (
                <div
                  className="absolute inset-0 rounded-md bg-primary/10 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span>{option.text}</span>
                {showResults && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showResults && (
        <p className="text-xs text-muted-foreground">
          {currentTotal} {currentTotal === 1 ? "vote" : "votes"}
        </p>
      )}
    </div>
  );
}
