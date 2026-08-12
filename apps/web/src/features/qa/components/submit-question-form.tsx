"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@attendly/ui/components";
import { Send } from "lucide-react";
import { submitQuestion } from "../actions";
import { toast } from "sonner";

export function SubmitQuestionForm({
  sessionId,
  eventId,
  moderationEnabled,
  anonymousEnabled,
}: {
  sessionId: string;
  eventId: string;
  moderationEnabled: boolean;
  anonymousEnabled: boolean;
}) {
  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    startTransition(async () => {
      try {
        await submitQuestion({
          session_id: sessionId,
          event_id: eventId,
          question_text: text.trim(),
          is_anonymous: isAnonymous,
          moderation_enabled: moderationEnabled,
        });
        setText("");
        setIsAnonymous(false);
        toast.success(
          moderationEnabled
            ? "Question submitted for review"
            : "Question submitted"
        );
      } catch {
        toast.error("Sign in to ask a question");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a question..."
        rows={2}
        className="resize-none"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {anonymousEnabled && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-border"
              />
              Ask anonymously
            </label>
          )}
          {moderationEnabled && (
            <p className="text-xs text-muted-foreground">
              Your question will be visible after approval
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={isPending || !text.trim()}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {isPending ? "Sending..." : "Ask"}
        </Button>
      </div>
    </form>
  );
}
