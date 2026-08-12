"use client";

import { useState, useTransition } from "react";
import { Button, EmptyState } from "@attendly/ui/components";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import { moderateQuestion, bulkModerateQuestions } from "../actions";
import type { SessionQuestion } from "../queries";
import { toast } from "sonner";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ModerationQueue({
  questions,
  eventId,
}: {
  questions: SessionQuestion[];
  eventId: string;
}) {
  const [items, setItems] = useState(questions);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((q) => q.id)));
    }
  }

  function handleModerate(questionId: string, status: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await moderateQuestion(questionId, eventId, status);
        setItems((prev) => prev.filter((q) => q.id !== questionId));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        toast.success(`Question ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to moderate question");
      }
    });
  }

  function handleBulkModerate(status: "approved" | "rejected") {
    if (selected.size === 0) return;

    startTransition(async () => {
      try {
        const ids = Array.from(selected);
        await bulkModerateQuestions(ids, eventId, status);
        setItems((prev) => prev.filter((q) => !selected.has(q.id)));
        setSelected(new Set());
        toast.success(`${ids.length} question(s) ${status}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to moderate questions");
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-8 w-8" />}
        title="No pending questions"
        description="All questions have been moderated. New questions will appear here when submitted."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.size === items.length && items.length > 0}
            onChange={toggleSelectAll}
            className="rounded border-border"
          />
          Select all ({items.length})
        </label>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkModerate("approved")}
              disabled={isPending}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Approve ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkModerate("rejected")}
              disabled={isPending}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject ({selected.size})
            </Button>
          </div>
        )}
      </div>

      {/* Question list */}
      <div className="divide-y rounded-lg border">
        {items.map((q) => {
          const authorName =
            q.is_anonymous
              ? "Anonymous"
              : q.profiles?.full_name ?? "Unknown";

          return (
            <div key={q.id} className="flex items-start gap-3 p-4">
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() => toggleSelect(q.id)}
                className="mt-1 rounded border-border"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {q.session_title && (
                    <>
                      <span className="font-medium text-foreground">
                        {q.session_title}
                      </span>
                      <span>-</span>
                    </>
                  )}
                  <span>{authorName}</span>
                  <span>-</span>
                  <Clock className="h-3 w-3" />
                  <span>{timeAgo(q.created_at)}</span>
                </div>
                <p className="mt-1 text-sm">{q.question_text}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleModerate(q.id, "approved")}
                  disabled={isPending}
                  title="Approve"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleModerate(q.id, "rejected")}
                  disabled={isPending}
                  title="Reject"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
