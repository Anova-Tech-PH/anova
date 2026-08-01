"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, Card } from "@attendly/ui/components";
import { createOrUpdateSurvey, toggleSurveyActive } from "../actions";
import type { Survey, SurveyQuestion } from "../queries";

function generateId() {
  return crypto.randomUUID();
}

const emptyQuestion: () => SurveyQuestion = () => ({
  id: generateId(),
  label: "",
  type: "rating",
  options: [],
  required: true,
});

export function SurveyBuilder({
  eventId,
  initialSurvey,
}: {
  eventId: string;
  initialSurvey: Survey | null;
}) {
  const [title, setTitle] = useState(initialSurvey?.title ?? "Post-Event Feedback");
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initialSurvey?.questions?.length ? initialSurvey.questions : [emptyQuestion()]
  );
  const [active, setActive] = useState(initialSurvey?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, updates: Partial<SurveyQuestion>) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }

  async function handleSave() {
    const validQuestions = questions.filter((q) => q.label.trim());
    if (validQuestions.length === 0) {
      toast.error("Add at least one question with a label");
      return;
    }
    setSaving(true);
    try {
      await createOrUpdateSurvey(eventId, {
        title: title.trim() || "Post-Event Feedback",
        questions: validQuestions,
      });
      toast.success(initialSurvey ? "Survey updated" : "Survey created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save survey");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!initialSurvey) return;
    setToggling(true);
    try {
      await toggleSurveyActive(eventId, initialSurvey.id, !active);
      setActive(!active);
      toast.success(active ? "Survey deactivated" : "Survey activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle survey");
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {initialSurvey ? "Edit Survey" : "Create Survey"}
        </h2>
        {initialSurvey && (
          <div className="flex items-center gap-2">
            <Badge variant={active ? "success" : "outline"}>
              {active ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={toggling}
            >
              {active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Survey Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post-Event Feedback"
          />
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Questions</label>

          {questions.map((q, idx) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
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
                    <div className="flex rounded-lg border">
                      {(["rating", "text", "select"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateQuestion(q.id, { type })}
                          className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                            q.type === type
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {/* Required toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(q.id, { required: !q.required })
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        q.required
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {q.required ? "Required" : "Optional"}
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(q.id)}
                      className="ml-auto h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Options for select type */}
                  {q.type === "select" && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        Options (one per line)
                      </label>
                      <textarea
                        value={(q.options ?? []).join("\n")}
                        onChange={(e) =>
                          updateQuestion(q.id, {
                            options: e.target.value.split("\n"),
                          })
                        }
                        placeholder={"Option 1\nOption 2\nOption 3"}
                        rows={3}
                        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Save */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} loading={saving}>
            {initialSurvey ? "Save Changes" : "Create Survey"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
