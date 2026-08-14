"use client";

import { useState } from "react";
import { toast } from "sonner";
import { askQuestion } from "@/features/session-qa/actions";

export function AskQuestionForm({
  sessionId,
  eventId,
}: {
  sessionId: string;
  eventId: string;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      await askQuestion({ sessionId, eventId, content });
      setContent("");
      toast.success("Question submitted!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit question";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your question..."
        rows={3}
        maxLength={1000}
        className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {content.length}/1000
        </span>
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Ask Question"}
        </button>
      </div>
    </form>
  );
}
