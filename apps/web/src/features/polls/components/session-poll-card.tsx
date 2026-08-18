"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { votePoll, voteRating, voteText, voteCheckbox } from "@/features/polls/actions";
import type { PollWithResults } from "@/features/polls/queries";

// ── Checkbox voting UI ──────────────────────────────────────────────

function CheckboxVoting({
  poll,
  initialVotes,
  isClosed,
}: {
  poll: PollWithResults;
  initialVotes: string[];
  isClosed: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(initialVotes);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(initialVotes.length > 0);

  function toggleOption(optionId: string) {
    setSelected((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }

  async function handleSubmit() {
    if (selected.length === 0 || loading || isClosed) return;
    setLoading(true);
    try {
      await voteCheckbox(poll.id, selected);
      setSubmitted(true);
      toast.success("Vote recorded!");
    } catch {
      toast.error("Sign in to vote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {poll.options.map((option) => (
        <label
          key={option.id}
          className={`flex items-center gap-2 rounded-md border-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
            selected.includes(option.id)
              ? "border-primary bg-primary/5 font-medium"
              : "border-border hover:border-primary/30"
          } ${isClosed ? "cursor-default" : ""}`}
        >
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => toggleOption(option.id)}
            disabled={isClosed || loading}
            className="rounded border-border accent-primary"
          />
          <span>{option.text}</span>
          {selected.includes(option.id) && (
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0">
              <Check className="h-3 w-3 text-primary-foreground" />
            </span>
          )}
        </label>
      ))}
      {!isClosed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || selected.length === 0}
          className="rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Submitting..." : submitted ? "Update vote" : "Submit"}
        </button>
      )}
    </div>
  );
}

// ── Star rating voting UI ───────────────────────────────────────────

function StarRatingVoting({
  pollId,
  initialRating,
  isClosed,
}: {
  pollId: string;
  initialRating: number | null;
  isClosed: boolean;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRate(value: number) {
    if (isClosed || loading) return;
    setLoading(true);
    try {
      await voteRating(pollId, value);
      setRating(value);
      toast.success("Rating submitted!");
    } catch {
      toast.error("Sign in to rate");
    } finally {
      setLoading(false);
    }
  }

  const displayValue = hovered ?? rating;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleRate(star)}
          onMouseEnter={() => !isClosed && setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          disabled={isClosed || loading}
          className={`text-2xl transition-colors ${
            displayValue !== null && star <= displayValue
              ? "text-yellow-400"
              : "text-muted-foreground/30"
          } hover:text-yellow-400 disabled:cursor-default`}
        >
          ★
        </button>
      ))}
      {rating !== null && (
        <span className="ml-2 text-sm text-muted-foreground self-center">
          {rating}/5
        </span>
      )}
    </div>
  );
}

// ── Text voting UI (short_answer & word_cloud) ──────────────────────

function TextVoting({
  pollId,
  initialResponse,
  placeholder,
  isClosed,
}: {
  pollId: string;
  initialResponse: string | null;
  placeholder: string;
  isClosed: boolean;
}) {
  const [text, setText] = useState(initialResponse ?? "");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(initialResponse !== null);

  async function handleSubmit() {
    if (!text.trim() || loading || isClosed) return;
    setLoading(true);
    try {
      await voteText(pollId, text.trim());
      setSubmitted(true);
      toast.success("Response submitted!");
    } catch {
      toast.error("Sign in to respond");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={isClosed || loading}
        className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-default"
      />
      {!isClosed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : submitted ? "Update" : "Submit"}
        </button>
      )}
    </div>
  );
}

// ── Main SessionPollCard ────────────────────────────────────────────

export function SessionPollCard({
  poll,
  userVote,
  userTextResponse,
  userRating,
  userCheckboxVotes,
}: {
  poll: PollWithResults;
  userVote: string | null;
  userTextResponse?: string | null;
  userRating?: number | null;
  userCheckboxVotes?: string[];
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(userVote);
  const [voteCounts, setVoteCounts] = useState(poll.vote_counts);
  const [totalVotes, setTotalVotes] = useState(poll.total_votes);
  const [loading, setLoading] = useState(false);

  const hasVoted = selectedOption !== null;
  const showResults = hasVoted || poll.show_results;
  const isClosed = poll.status === "closed";
  const answerType = poll.answer_type ?? "multiple_choice";

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
        {answerType === "multiple_choice" &&
          poll.options.map((option) => {
            const count = voteCounts[option.id] ?? 0;
            const pct = currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0;
            const isSelected = selectedOption === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={isClosed || loading}
                className={`relative w-full rounded-md border-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
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
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                    <span>{option.text}</span>
                  </div>
                  {showResults && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}

        {answerType === "checkbox" && (
          <CheckboxVoting poll={poll} initialVotes={userCheckboxVotes ?? []} isClosed={isClosed} />
        )}

        {answerType === "star_rating" && (
          <StarRatingVoting pollId={poll.id} initialRating={userRating ?? null} isClosed={isClosed} />
        )}

        {answerType === "short_answer" && (
          <TextVoting pollId={poll.id} initialResponse={userTextResponse ?? null} placeholder="Type your answer..." isClosed={isClosed} />
        )}

        {answerType === "word_cloud" && (
          <TextVoting pollId={poll.id} initialResponse={userTextResponse ?? null} placeholder="Enter a word or short phrase..." isClosed={isClosed} />
        )}
      </div>

      {/* Results summary */}
      {showResults && answerType === "multiple_choice" && (
        <p className="text-xs text-muted-foreground">
          {currentTotal} {currentTotal === 1 ? "vote" : "votes"}
        </p>
      )}

      {showResults && answerType === "star_rating" && poll.average_rating !== undefined && (
        <p className="text-xs text-muted-foreground">
          Average: {poll.average_rating.toFixed(1)}/5 ({poll.total_votes} {poll.total_votes === 1 ? "rating" : "ratings"})
        </p>
      )}

      {showResults && answerType === "short_answer" && (
        <p className="text-xs text-muted-foreground">
          {poll.total_votes} {poll.total_votes === 1 ? "response" : "responses"}
        </p>
      )}

      {showResults && answerType === "word_cloud" && (
        <p className="text-xs text-muted-foreground">
          {poll.total_votes} {poll.total_votes === 1 ? "response" : "responses"}
        </p>
      )}

      {showResults && answerType === "checkbox" && (
        <p className="text-xs text-muted-foreground">
          {currentTotal} {currentTotal === 1 ? "vote" : "votes"}
        </p>
      )}
    </div>
  );
}
