"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card, ModalOverlay } from "@attendly/ui/components";
import { createPoll } from "../actions";
import type { AnswerType } from "../queries";

function generateId() {
  return crypto.randomUUID();
}

export function AddPollDialog({
  eventId,
  sessionId,
}: {
  eventId: string;
  sessionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([
    { id: generateId(), text: "" },
    { id: generateId(), text: "" },
  ]);
  const [promptAttendee, setPromptAttendee] = useState(true);
  const [answerType, setAnswerType] = useState<AnswerType>("multiple_choice");
  const [loading, setLoading] = useState(false);

  function addOption() {
    setOptions([...options, { id: generateId(), text: "" }]);
  }

  function removeOption(id: string) {
    if (options.length <= 2) return;
    setOptions(options.filter((o) => o.id !== id));
  }

  function updateOption(id: string, text: string) {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  }

  function resetForm() {
    setQuestion("");
    setOptions([
      { id: generateId(), text: "" },
      { id: generateId(), text: "" },
    ]);
    setPromptAttendee(true);
    setAnswerType("multiple_choice");
  }

  async function handleSubmit() {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const needsOptions = answerType === "multiple_choice" || answerType === "checkbox";
    const validOptions = options.filter((o) => o.text.trim());
    if (needsOptions && validOptions.length < 2) {
      toast.error("Please add at least 2 options");
      return;
    }

    setLoading(true);
    try {
      await createPoll(eventId, {
        question: question.trim(),
        options: needsOptions ? validOptions.map((o) => ({ id: o.id, text: o.text.trim() })) : [],
        session_id: sessionId,
        prompt_attendee: promptAttendee,
        open_time_mode: "now",
        answer_type: answerType,
      });
      toast.success("Poll created!");
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Failed to create poll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add a poll
      </Button>

      {open && (
        <ModalOverlay onClose={() => !loading && setOpen(false)}>
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Poll</h2>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="poll-question" className="text-sm font-medium">
                Question
              </label>
              <Input
                id="poll-question"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dialog-poll-answer-type" className="text-sm font-medium">
                Answer type
              </label>
              <select
                id="dialog-poll-answer-type"
                value={answerType}
                onChange={(e) => setAnswerType(e.target.value as AnswerType)}
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="multiple_choice">Multiple choice</option>
                <option value="checkbox">Checkbox (multi-select)</option>
                <option value="short_answer">Short answer</option>
                <option value="star_rating">Star rating</option>
                <option value="word_cloud">Word cloud</option>
              </select>
            </div>

            {(answerType === "multiple_choice" || answerType === "checkbox") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              {options.map((option, i) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={option.text}
                    onChange={(e) => updateOption(option.id, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      aria-label="Remove option"
                      onClick={() => removeOption(option.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={addOption}
                className="gap-1.5 text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </Button>
            </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="prompt-attendee"
                checked={promptAttendee}
                onChange={(e) => setPromptAttendee(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="prompt-attendee" className="text-sm">
                Prompt attendees to answer this poll
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Creating..." : "Add poll"}
              </Button>
            </div>
          </Card>
        </ModalOverlay>
      )}
    </>
  );
}
