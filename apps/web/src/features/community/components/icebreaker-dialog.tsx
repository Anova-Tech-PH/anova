"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Textarea } from "@attendly/ui/components";
import { ModalOverlay } from "@attendly/ui/components";
import { submitIcebreaker } from "@/features/community/actions";
import { toast } from "sonner";

interface IcebreakerDialogProps {
  eventId: string;
  question: string;
  options: string[] | null;
  hasResponded: boolean;
}

const STORAGE_KEY_PREFIX = "icebreaker_skipped_";

export function IcebreakerDialog({
  eventId,
  question,
  options,
  hasResponded,
}: IcebreakerDialogProps) {
  const [open, setOpen] = useState(false);
  const [introduction, setIntroduction] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (hasResponded) return;
    const skipped = localStorage.getItem(STORAGE_KEY_PREFIX + eventId);
    if (!skipped) {
      setOpen(true);
    }
  }, [eventId, hasResponded]);

  function handleSkip() {
    localStorage.setItem(STORAGE_KEY_PREFIX + eventId, "true");
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await submitIcebreaker(eventId, {
          introduction: introduction.trim(),
          answer: answer.trim(),
        });
        toast.success("Icebreaker submitted!");
        setOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit icebreaker"
        );
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={handleSkip}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-1">Break the Ice!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Introduce yourself to other attendees.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Introduce yourself
            </label>
            <Textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              placeholder="Hi! I'm..."
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {question}
            </label>
            {options && options.length > 0 ? (
              <div className="space-y-2">
                {options.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="icebreaker-answer"
                      value={opt}
                      checked={answer === opt}
                      onChange={() => setAnswer(opt)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer..."
                rows={2}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isPending}
            >
              Skip
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
