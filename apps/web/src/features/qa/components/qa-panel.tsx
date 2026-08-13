"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@attendly/ui/supabase/client";
import { MessageSquare } from "lucide-react";
import { QuestionCard, type QuestionCardData } from "./question-card";
import { SubmitQuestionForm } from "./submit-question-form";

type QAPanelProps = {
  sessionId: string;
  eventId: string;
  initialQuestions: QuestionCardData[];
  qaEnabled: boolean;
  moderationEnabled: boolean;
  anonymousEnabled: boolean;
  userUpvotedIds?: string[];
};

function sortQuestions(questions: QuestionCardData[]): QuestionCardData[] {
  return [...questions].sort((a, b) => {
    // Pinned first
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    // Then by upvote count DESC
    if (a.upvote_count !== b.upvote_count) return b.upvote_count - a.upvote_count;
    // Then by created_at DESC
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function QAPanel({
  sessionId,
  eventId,
  initialQuestions,
  qaEnabled,
  moderationEnabled,
  anonymousEnabled,
  userUpvotedIds = [],
}: QAPanelProps) {
  const [questions, setQuestions] = useState<QuestionCardData[]>(() =>
    sortQuestions(initialQuestions)
  );
  const [upvotedSet] = useState(() => new Set(userUpvotedIds));

  const handleInsert = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const newQ = payload.new as unknown as QuestionCardData;
      // Only show approved or answered
      if (newQ.status !== "approved" && newQ.status !== "answered") return;
      setQuestions((prev) => {
        // Don't add duplicates
        if (prev.some((q) => q.id === newQ.id)) return prev;
        return sortQuestions([...prev, newQ]);
      });
    },
    []
  );

  const handleUpdate = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const updated = payload.new as unknown as QuestionCardData;
      setQuestions((prev) => {
        // If rejected or pending, remove from list
        if (updated.status === "rejected" || updated.status === "pending") {
          return prev.filter((q) => q.id !== updated.id);
        }
        // If not in list and now approved/answered, add it
        const exists = prev.some((q) => q.id === updated.id);
        if (!exists) {
          return sortQuestions([...prev, updated]);
        }
        // Update in place
        return sortQuestions(
          prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q))
        );
      });
    },
    []
  );

  const handleDelete = useCallback(
    (payload: { old: Record<string, unknown> }) => {
      const deleted = payload.old as unknown as { id: string };
      setQuestions((prev) => prev.filter((q) => q.id !== deleted.id));
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`qa-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        handleInsert
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        handleUpdate
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "session_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        handleDelete
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, handleInsert, handleUpdate, handleDelete]);

  if (!qaEnabled) return null;

  return (
    <div className="space-y-6">
      <SubmitQuestionForm
        sessionId={sessionId}
        eventId={eventId}
        moderationEnabled={moderationEnabled}
        anonymousEnabled={anonymousEnabled}
      />

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No questions yet. Be the first to ask!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              userUpvoted={upvotedSet.has(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
