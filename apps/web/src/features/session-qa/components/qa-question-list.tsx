"use client";

import { useState, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleUpvote } from "@/features/session-qa/actions";
import type { AttendeeQuestion } from "@/features/session-qa/queries";

export function QAQuestionList({
  questions: initialQuestions,
  sessionTitle,
}: {
  questions: AttendeeQuestion[];
  sessionTitle: string;
}) {
  const [questions, setQuestions] = useState(initialQuestions);

  function handleUpvoteOptimistic(questionId: string) {
    setQuestions((prev) =>
      prev
        .map((q) => {
          if (q.id !== questionId) return q;
          const wasUpvoted = q.is_upvoted;
          return {
            ...q,
            is_upvoted: !wasUpvoted,
            upvote_count: wasUpvoted
              ? Math.max(0, q.upvote_count - 1)
              : q.upvote_count + 1,
          };
        })
        .sort((a, b) => b.upvote_count - a.upvote_count)
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{sessionTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No questions yet. Be the first to ask!
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onOptimisticUpvote={handleUpvoteOptimistic}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  onOptimisticUpvote,
}: {
  question: AttendeeQuestion;
  onOptimisticUpvote: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleUpvote() {
    if (loading) return;
    setLoading(true);
    onOptimisticUpvote(question.id);
    try {
      await toggleUpvote(question.id);
    } catch {
      // Revert on error
      onOptimisticUpvote(question.id);
      toast.error("Sign in to upvote questions");
    } finally {
      setLoading(false);
    }
  }

  const timeAgo = getRelativeTime(new Date(question.created_at));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-3">
        {/* Upvote button */}
        <button
          onClick={handleUpvote}
          disabled={loading}
          className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-xs transition-colors ${
            question.is_upvoted
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill={question.is_upvoted ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
          <span>{question.upvote_count}</span>
        </button>

        {/* Question content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">{question.question_text}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {question.is_anonymous ? "Anonymous" : timeAgo}
            </span>
            {question.status === "answered" && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Answered
              </span>
            )}
          </div>
          {question.answer_text && (
            <div className="mt-3 rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Answer
              </p>
              <p className="text-sm">{question.answer_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
