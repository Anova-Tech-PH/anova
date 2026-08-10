"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitSessionFeedback } from "@/features/feedback/actions";
import type { FeedbackQuestion } from "@/features/feedback/queries";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-xl transition-colors"
        >
          <span className={star <= (hover || value) ? "text-amber-400" : "text-gray-300"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export function SessionFeedbackForm({
  sessionId,
  formId,
  questions,
  sessionEndTime,
}: {
  sessionId: string;
  formId: string;
  questions: FeedbackQuestion[];
  sessionEndTime: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const endTime = new Date(sessionEndTime);
  if (now < endTime) return null;

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        Thank you for your feedback!
      </div>
    );
  }

  function updateAnswer(questionId: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await submitSessionFeedback(sessionId, formId, answers);
      setSubmitted(true);
      toast.success("Feedback submitted!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit";
      if (message.includes("already submitted")) {
        setSubmitted(true);
        toast.info("You have already submitted feedback for this session.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-4">
      <h4 className="text-sm font-medium">Session Feedback</h4>

      {questions.map((q) => (
        <div key={q.id} className="space-y-1.5">
          <label className="text-sm text-muted-foreground">
            {q.label}
            {q.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>

          {q.type === "rating" && (
            <StarRating
              value={(answers[q.id] as number) ?? 0}
              onChange={(v) => updateAnswer(q.id, v)}
            />
          )}

          {q.type === "multiple_choice" && (
            <div className="space-y-1">
              {(q.options ?? []).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => updateAnswer(q.id, opt)}
                    className="accent-primary"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {q.type === "text" && (
            <textarea
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => updateAnswer(q.id, e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your feedback..."
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Feedback"}
      </button>
    </form>
  );
}
