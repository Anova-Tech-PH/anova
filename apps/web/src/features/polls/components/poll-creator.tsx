"use client";

import { useState, useTransition } from "react";
import { createPoll } from "@/features/polls/actions";

export function PollCreator({
  eventId,
  sessions,
}: {
  eventId: string;
  sessions: { id: string; title: string }[];
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [sessionId, setSessionId] = useState("");
  const [isPending, startTransition] = useTransition();

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function resetForm() {
    setQuestion("");
    setOptions(["", ""]);
    setSessionId("");
  }

  function handleCreate() {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQuestion || trimmedOptions.length < 2) return;

    startTransition(async () => {
      await createPoll(eventId, {
        question: trimmedQuestion,
        options: trimmedOptions.map((text, i) => ({
          id: String.fromCharCode(97 + i), // a, b, c, ...
          text,
        })),
        session_id: sessionId || undefined,
      });
      resetForm();
    });
  }

  return (
    <div className="rounded-xl border p-6 space-y-4">
      <h3 className="text-lg font-semibold">Create Poll</h3>

      <div className="space-y-1.5">
        <label htmlFor="poll-question" className="text-sm font-medium">
          Question
        </label>
        <input
          id="poll-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Which topic should we cover next?"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Options (min 2)</span>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm text-muted-foreground font-medium">
                {String.fromCharCode(65 + i)}.
              </span>
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="rounded-lg border px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="mt-1 text-sm text-muted-foreground hover:text-foreground"
        >
          + Add option
        </button>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="poll-session" className="text-sm font-medium">
          Associate with session (optional)
        </label>
        <select
          id="poll-session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">No session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !question.trim() || options.filter((o) => o.trim()).length < 2}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Poll"}
        </button>
      </div>
    </div>
  );
}
