"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { createGroup, updateGroup } from "@/features/social-groups/actions";
import type { SocialGroup } from "@/features/social-groups/queries";
import { toast } from "sonner";

interface GroupComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  draft?: SocialGroup | null;
}

export function GroupComposer({
  eventId,
  open,
  onClose,
  draft,
}: GroupComposerProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!draft;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!open) return;

    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description ?? "");
      setPrompt(draft.prompt ?? "");
    } else {
      setTitle("");
      setDescription("");
      setPrompt("");
    }
  }, [open, draft]);

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || undefined,
          prompt: prompt.trim() || undefined,
        };

        if (isEditing) {
          await updateGroup(eventId, draft.id, payload);
          toast.success("Group updated");
        } else {
          await createGroup(eventId, payload);
          toast.success("Group created");
        }
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 rounded-xl bg-card p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold">
          {isEditing ? "Edit Group" : "New Group"}
        </h3>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Name *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Group name"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the group"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask a question to kick off the discussion"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />
            {isPending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save"
                : "Create"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
