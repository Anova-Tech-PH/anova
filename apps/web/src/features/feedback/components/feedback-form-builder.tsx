"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card } from "@attendly/ui/components";
import { createFeedbackForm, updateFeedbackForm } from "../actions";
import type { FeedbackForm, FeedbackQuestion } from "../queries";

function generateId() {
  return crypto.randomUUID();
}

const defaultQuestions: () => FeedbackQuestion[] = () => [
  {
    id: generateId(),
    label: "Overall session rating",
    type: "rating",
    required: true,
  },
  {
    id: generateId(),
    label: "Speaker effectiveness",
    type: "rating",
    required: true,
  },
  {
    id: generateId(),
    label: "Would you recommend this session?",
    type: "multiple_choice",
    options: ["Yes", "No", "Maybe"],
    required: true,
  },
  {
    id: generateId(),
    label: "Additional comments",
    type: "text",
    required: false,
  },
];

export function FeedbackFormBuilder({
  eventId,
  initialForm,
}: {
  eventId: string;
  initialForm: FeedbackForm | null;
}) {
  const [name, setName] = useState(
    initialForm?.name ?? "Session Feedback"
  );
  const [questions, setQuestions] = useState<FeedbackQuestion[]>(
    initialForm?.questions?.length ? initialForm.questions : defaultQuestions()
  );
  const [isPending, startTransition] = useTransition();

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: generateId(),
        label: "",
        type: "rating",
        required: true,
      },
    ]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, updates: Partial<FeedbackQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }

  function moveQuestion(idx: number, direction: "up" | "down") {
    setQuestions((prev) => {
      const next = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }

  function handleSave() {
    const validQuestions = questions.filter((q) => q.label.trim());
    if (validQuestions.length === 0) {
      toast.error("Add at least one question with a label");
      return;
    }

    startTransition(async () => {
      try {
        if (initialForm) {
          await updateFeedbackForm(eventId, initialForm.id, {
            name: name.trim() || "Session Feedback",
            questions: validQuestions,
          });
          toast.success("Feedback form updated");
        } else {
          await createFeedbackForm(eventId, {
            name: name.trim() || "Session Feedback",
            questions: validQuestions,
            is_default: true,
          });
          toast.success("Feedback form created");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save feedback form"
        );
      }
    });
  }

  return (
    <Card className="p-6">
      <h3 className="mb-6 text-lg font-semibold">
        {initialForm ? "Edit Feedback Form" : "Create Feedback Form"}
      </h3>

      <div className="space-y-6">
        {/* Form Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Form Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Session Feedback"
          />
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Questions</label>

          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <div className="mt-2 flex flex-col items-center gap-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => moveQuestion(idx, "up")}
                    disabled={idx === 0}
                    className="text-xs hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    &uarr;
                  </button>
                  <GripVertical className="h-4 w-4" />
                  <button
                    type="button"
                    onClick={() => moveQuestion(idx, "down")}
                    disabled={idx === questions.length - 1}
                    className="text-xs hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    &darr;
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Q{idx + 1}
                    </span>
                    <Input
                      value={q.label}
                      onChange={(e) =>
                        updateQuestion(q.id, { label: e.target.value })
                      }
                      placeholder="Enter your question..."
                      className="flex-1"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Type selector */}
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestion(q.id, {
                          type: e.target.value as FeedbackQuestion["type"],
                          options:
                            e.target.value === "multiple_choice"
                              ? q.options?.length
                                ? q.options
                                : ["Option 1"]
                              : q.options,
                        })
                      }
                      className="rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="rating">Rating</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="text">Text</option>
                    </select>

                    {/* Required checkbox */}
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          updateQuestion(q.id, { required: e.target.checked })
                        }
                        className="rounded border"
                      />
                      Required
                    </label>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(q.id)}
                      className="ml-auto h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Options for multiple_choice */}
                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">
                        Options
                      </label>
                      {(q.options ?? []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options ?? [])];
                              newOpts[optIdx] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newOpts = (q.options ?? []).filter(
                                (_, i) => i !== optIdx
                              );
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateQuestion(q.id, {
                            options: [...(q.options ?? []), ""],
                          })
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Save */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending
              ? "Saving..."
              : initialForm
                ? "Save Changes"
                : "Create Form"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
