"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card } from "@attendly/ui/components";
import { submitSurveyResponse } from "@/features/surveys/actions";

type Question = {
  id: string;
  label: string;
  type: "rating" | "text" | "select";
  options?: string[];
  required: boolean;
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            star <= (hovered || value)
              ? "text-yellow-500"
              : "text-muted-foreground/30"
          }`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

export function FeedbackForm({
  surveyId,
  questions,
}: {
  surveyId: string;
  questions: Question[];
}) {
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateAnswer(questionId: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // Validate required questions
    for (const q of questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === "" || val === 0) {
          toast.error(`Please answer: ${q.label}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await submitSurveyResponse(surveyId, email, answers);
      setSubmitted(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit response"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
        <h2 className="text-xl font-semibold">Thank you!</h2>
        <p className="mt-2 text-muted-foreground">
          Your feedback has been submitted successfully.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email field */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Your Email *</label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      {/* Questions */}
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="text-sm font-medium">
            {q.label}
            {q.required && <span className="ml-0.5 text-destructive">*</span>}
          </label>

          {q.type === "rating" && (
            <StarRating
              value={(answers[q.id] as number) ?? 0}
              onChange={(val) => updateAnswer(q.id, val)}
            />
          )}

          {q.type === "text" && (
            <textarea
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => updateAnswer(q.id, e.target.value)}
              placeholder="Your answer..."
              rows={3}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}

          {q.type === "select" && (
            <div className="space-y-2">
              {(q.options ?? [])
                .filter((opt) => opt.trim())
                .map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      answers[q.id] === option
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => updateAnswer(q.id, option)}
                      className="accent-primary"
                    />
                    {option}
                  </label>
                ))}
            </div>
          )}
        </div>
      ))}

      <Button type="submit" className="w-full" loading={submitting}>
        Submit Feedback
      </Button>
    </form>
  );
}
