"use client";

import { Card } from "@attendly/ui/components";
import type { SurveyQuestion } from "../queries";

type QuestionStat = {
  type: SurveyQuestion["type"];
  label: string;
  averageRating?: number;
  ratingDistribution?: Record<number, number>;
  textResponses?: string[];
  optionDistribution?: Record<string, number>;
};

type SurveyStatsData = {
  totalResponses: number;
  questionStats: Record<string, QuestionStat>;
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${
            star <= Math.round(rating)
              ? "text-yellow-500"
              : "text-muted-foreground/30"
          }`}
        >
          &#9733;
        </span>
      ))}
      <span className="ml-1.5 text-sm font-medium">{rating}/5</span>
    </div>
  );
}

function RatingBar({
  value,
  count,
  maxCount,
}: {
  value: number;
  count: number;
  maxCount: number;
}) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-muted-foreground">{value}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
        <div
          className="h-full rounded-full bg-yellow-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

function OptionBar({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  maxCount: number;
}) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="overflow-hidden rounded-full bg-muted h-2">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function SurveyResults({
  stats,
  questions,
}: {
  stats: SurveyStatsData;
  questions: SurveyQuestion[];
}) {
  if (stats.totalResponses === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No responses yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Responses will appear here once attendees submit feedback.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="text-center">
          <p className="text-3xl font-bold">{stats.totalResponses}</p>
          <p className="text-sm text-muted-foreground">
            Total Response{stats.totalResponses !== 1 ? "s" : ""}
          </p>
        </div>
      </Card>

      {questions.map((q) => {
        const qStats = stats.questionStats[q.id];
        if (!qStats) return null;

        return (
          <Card key={q.id} className="p-5">
            <h3 className="mb-3 font-medium">{qStats.label}</h3>

            {qStats.type === "rating" && (
              <div className="space-y-3">
                <StarDisplay rating={qStats.averageRating ?? 0} />
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((val) => {
                    const dist = qStats.ratingDistribution ?? {};
                    const maxCount = Math.max(
                      ...Object.values(dist),
                      1
                    );
                    return (
                      <RatingBar
                        key={val}
                        value={val}
                        count={dist[val] ?? 0}
                        maxCount={maxCount}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {qStats.type === "text" && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(qStats.textResponses ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No text responses</p>
                ) : (
                  (qStats.textResponses ?? []).map((text, i) => (
                    <div
                      key={i}
                      className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      {text}
                    </div>
                  ))
                )}
              </div>
            )}

            {qStats.type === "select" && (
              <div className="space-y-2">
                {Object.entries(qStats.optionDistribution ?? {}).map(
                  ([option, count]) => {
                    const maxCount = Math.max(
                      ...Object.values(qStats.optionDistribution ?? {}),
                      1
                    );
                    return (
                      <OptionBar
                        key={option}
                        label={option}
                        count={count}
                        maxCount={maxCount}
                      />
                    );
                  }
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
