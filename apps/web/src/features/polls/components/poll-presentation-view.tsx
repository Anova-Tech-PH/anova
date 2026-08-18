"use client";

import type { PollWithResults } from "@/features/polls/queries";

export function PollPresentationView({ poll }: { poll: PollWithResults }) {
  const answerType = poll.answer_type ?? "multiple_choice";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-8 text-white">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-widest text-gray-400">
            Live Poll
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">{poll.question}</h1>
          <p className="text-lg text-gray-400">
            {poll.total_votes}{" "}
            {poll.total_votes === 1 ? "response" : "responses"}
          </p>
        </div>

        <div className="rounded-2xl bg-gray-900 p-6 md:p-8">
          {(answerType === "multiple_choice" || answerType === "checkbox") && (
            <PresentationBarChart poll={poll} />
          )}
          {answerType === "star_rating" && (
            <PresentationStarRating poll={poll} />
          )}
          {answerType === "short_answer" && (
            <PresentationTextResponses
              responses={poll.text_responses ?? []}
            />
          )}
          {answerType === "word_cloud" && (
            <PresentationWordCloud
              frequencies={poll.word_frequencies ?? {}}
            />
          )}
        </div>

        <p className="text-center text-xs text-gray-600">
          Powered by Eventriv
        </p>
      </div>
    </div>
  );
}

function PresentationBarChart({ poll }: { poll: PollWithResults }) {
  return (
    <div className="space-y-4">
      {poll.options.map((opt) => {
        const count = poll.vote_counts[opt.id] ?? 0;
        const pct =
          poll.total_votes > 0
            ? Math.round((count / poll.total_votes) * 100)
            : 0;
        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center justify-between text-lg">
              <span>{opt.text}</span>
              <span className="text-gray-400">
                {pct}%{" "}
                <span className="text-sm">({count})</span>
              </span>
            </div>
            <div className="h-6 w-full rounded-full bg-gray-800">
              <div
                className="h-6 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PresentationStarRating({ poll }: { poll: PollWithResults }) {
  const avg = poll.average_rating ?? 0;
  const dist = poll.rating_distribution ?? {};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4">
        <span className="text-6xl font-bold">{avg.toFixed(1)}</span>
        <div className="flex text-4xl text-yellow-400">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={s <= Math.round(avg) ? "" : "opacity-30"}
            >
              ★
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = dist[star] ?? 0;
          const pct =
            poll.total_votes > 0
              ? Math.round((count / poll.total_votes) * 100)
              : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-lg">
              <span className="w-20 text-right text-gray-400">
                {star} star{star !== 1 ? "s" : ""}
              </span>
              <div className="h-4 flex-1 rounded-full bg-gray-800">
                <div
                  className="h-4 rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-gray-400">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresentationTextResponses({
  responses,
}: {
  responses: string[];
}) {
  if (responses.length === 0) {
    return (
      <p className="text-center text-xl text-gray-500">
        Waiting for responses...
      </p>
    );
  }
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      {responses.slice(0, 20).map((r, i) => (
        <div key={i} className="rounded-lg bg-gray-800 px-4 py-3 text-lg">
          {r}
        </div>
      ))}
      {responses.length > 20 && (
        <p className="text-center text-gray-500">
          + {responses.length - 20} more responses
        </p>
      )}
    </div>
  );
}

function PresentationWordCloud({
  frequencies,
}: {
  frequencies: Record<string, number>;
}) {
  const entries = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <p className="text-center text-xl text-gray-500">
        Waiting for responses...
      </p>
    );
  }

  const maxCount = entries[0][1];
  const minSize = 1.25;
  const maxSize = 4;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      {entries.map(([word, count]) => {
        const size =
          maxCount > 1
            ? minSize +
              ((count - 1) / (maxCount - 1)) * (maxSize - minSize)
            : (minSize + maxSize) / 2;
        return (
          <span
            key={word}
            className="text-white/80"
            style={{ fontSize: `${size}rem` }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
