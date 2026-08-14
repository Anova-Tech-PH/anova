"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@attendly/ui/components";
import { saveIcebreakerConfig } from "../actions";

interface IcebreakerConfigProps {
  eventId: string;
  icebreaker: {
    id: string;
    event_id: string;
    question: string;
    options: string[];
    enabled: boolean;
  } | null;
}

export function IcebreakerConfig({ eventId, icebreaker }: IcebreakerConfigProps) {
  const [enabled, setEnabled] = useState(icebreaker?.enabled ?? true);
  const [question, setQuestion] = useState(icebreaker?.question ?? "");
  const [options, setOptions] = useState<string[]>(icebreaker?.options ?? []);
  const [optionInput, setOptionInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleAddOption(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = optionInput.trim();
      if (value && !options.includes(value)) {
        setOptions((prev) => [...prev, value]);
        setOptionInput("");
      }
    }
  }

  function handleRemoveOption(option: string) {
    setOptions((prev) => prev.filter((o) => o !== option));
  }

  function handleSave() {
    startTransition(async () => {
      await saveIcebreakerConfig(eventId, {
        question,
        options,
        enabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Icebreaker Question</CardTitle>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Attendees will see this question when they first visit the community board.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="icebreaker-question" className="text-sm font-medium">
            Question
          </label>
          <Textarea
            id="icebreaker-question"
            placeholder="e.g. What are you most excited to learn at this event?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="icebreaker-option-input" className="text-sm font-medium">
            Options (optional)
          </label>
          <p className="text-xs text-muted-foreground">
            Add predefined answer choices. Press Enter to add. Leave empty for free-text answers.
          </p>
          <Input
            id="icebreaker-option-input"
            placeholder="Type an option and press Enter"
            value={optionInput}
            onChange={(e) => setOptionInput(e.target.value)}
            onKeyDown={handleAddOption}
          />
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {options.map((option) => (
                <Badge key={option} variant="secondary" className="gap-1 pr-1">
                  {option}
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(option)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Remove ${option}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending || !question.trim()}>
            {isPending ? "Saving..." : "Save"}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">Saved successfully</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
