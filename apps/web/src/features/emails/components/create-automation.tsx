"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createEmailAutomation } from "../actions";

type Template = { id: string; name: string };

const triggerOptions = [
  { value: "on_registration", label: "On Registration" },
  { value: "pre_event_24h", label: "24 Hours Before Event" },
  { value: "pre_event_1h", label: "1 Hour Before Event" },
  { value: "post_event", label: "After Event Ends" },
];

export function CreateAutomation({
  eventId,
  templates,
  onCreated,
}: {
  eventId: string;
  templates: Template[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState(triggerOptions[0].value);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        <Plus className="h-4 w-4" /> Add Automation
      </button>
    );
  }

  function handleCreate() {
    if (!templateId) {
      toast.error("Select a template");
      return;
    }
    startTransition(async () => {
      try {
        await createEmailAutomation({ eventId, trigger, templateId });
        toast.success("Automation created");
        setOpen(false);
        onCreated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create");
      }
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-medium">New Automation</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Trigger</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {triggerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Template</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {templates.length === 0 && <option value="">No templates available</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={isPending || !templateId}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Create
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
