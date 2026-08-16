"use client";

import type { PollWithResults } from "@/features/polls/queries";

export function PollResultsChart({ poll }: { poll: PollWithResults }) {
  const answerType = poll.answer_type ?? "multiple_choice";

  if (answerType === "star_rating") {
    return <StarRatingResults poll={poll} />;
  }
  if (answerType === "short_answer") {
    return <TextResponseList responses={poll.text_responses ?? []} />;
  }
  if (answerType === "word_cloud") {
    return <WordCloudResults frequencies={poll.word_frequencies ?? {}} />;
  }
  // multiple_choice and checkbox — existing bar chart with percentages
  return <BarChartResults options={poll.options} voteCounts={poll.vote_counts} totalVotes={poll.total_votes} />;
}

function BarChartResults({
  options,
  voteCounts,
  totalVotes,
}: {
  options: { id: string; text: string }[];
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

function StarRatingResults({ poll }: { poll: PollWithResults }) {
  const avg = poll.average_rating ?? 0;
  const dist = poll.rating_distribution ?? {};
  const total = poll.total_votes;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
        <div className="flex text-yellow-400 text-xl">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Math.round(avg) ? "" : "opacity-30"}>
              ★
            </span>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? "rating" : "ratings"}
        </span>
      </div>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = dist[star] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-12">
              {star} star{star !== 1 ? "s" : ""}
            </span>
            <div className="h-3 flex-1 rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-yellow-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 text-right text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function TextResponseList({ responses }: { responses: string[] }) {
  if (responses.length === 0) {
    return <p className="text-sm text-muted-foreground">No responses yet.</p>;
  }
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {responses.map((r, i) => (
        <div key={i} className="rounded-md border px-3 py-2 text-sm">
          {r}
        </div>
      ))}
    </div>
  );
}

function WordCloudResults({
  frequencies,
}: {
  frequencies: Record<string, number>;
}) {
  const entries = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No responses yet.</p>;
  }

  const maxCount = entries[0][1];
  const minSize = 0.875; // rem
  const maxSize = 2.5; // rem

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {entries.map(([word, count]) => {
        const size =
          maxCount > 1
            ? minSize + ((count - 1) / (maxCount - 1)) * (maxSize - minSize)
            : (minSize + maxSize) / 2;
        return (
          <span
            key={word}
            className="inline-block text-foreground/80"
            style={{ fontSize: `${size}rem` }}
            title={`${word}: ${count}`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
