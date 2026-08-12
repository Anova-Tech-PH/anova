"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, Pin, MessageCircle } from "lucide-react";
import { toggleUpvote } from "../actions";
import { toast } from "sonner";

export type QuestionCardData = {
  id: string;
  question_text: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  upvote_count: number;
  status: string;
  answer_text: string | null;
  answered_by: string | null;
  answered_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  answerer_name?: string | null;
};

export function QuestionCard({
  question,
  userUpvoted,
}: {
  question: QuestionCardData;
  userUpvoted: boolean;
}) {
  const [upvoted, setUpvoted] = useState(userUpvoted);
  const [count, setCount] = useState(question.upvote_count);
  const [isPending, startTransition] = useTransition();

  function handleUpvote() {
    startTransition(async () => {
      try {
        const result = await toggleUpvote(question.id);
        setUpvoted(result.upvoted);
        setCount((c) => (result.upvoted ? c + 1 : Math.max(0, c - 1)));
      } catch {
        toast.error("Sign in to upvote");
      }
    });
  }

  const authorName = question.is_anonymous
    ? "Anonymous"
    : question.profiles?.full_name ?? "Anonymous";

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        question.is_pinned ? "border-primary/30 bg-primary/5" : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Upvote button */}
        <button
          onClick={handleUpvote}
          disabled={isPending}
          className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            upvoted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <ThumbsUp className={`h-4 w-4 ${upvoted ? "fill-current" : ""}`} />
          <span>{count}</span>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {question.is_pinned && (
              <Pin className="h-3.5 w-3.5 text-primary" />
            )}
            <span className="text-xs text-muted-foreground">{authorName}</span>
          </div>
          <p className="mt-1 text-sm">{question.question_text}</p>

          {/* Answer */}
          {question.status === "answered" && question.answer_text && (
            <div className="mt-3 rounded-md border-l-2 border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                <span>
                  Answered{" "}
                  {question.answerer_name
                    ? `by ${question.answerer_name}`
                    : ""}
                </span>
              </div>
              <p className="mt-1 text-sm">{question.answer_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
