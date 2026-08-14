"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { createTopic, updateTopic } from "@/features/discussion-topics/actions";
import type { DiscussionTopic } from "@/features/discussion-topics/queries";
import { toast } from "sonner";

interface TopicComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  draft?: DiscussionTopic | null;
}

export function TopicComposer({
  eventId,
  open,
  onClose,
  draft,
}: TopicComposerProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!draft;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;

    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description ?? "");
    } else {
      setTitle("");
      setDescription("");
    }
  }, [open, draft]);

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || undefined,
        };

        if (isEditing) {
          await updateTopic(eventId, draft.id, payload);
          toast.success("Topic updated");
        } else {
          await createTopic(eventId, payload);
          toast.success("Topic created");
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
          {isEditing ? "Edit Topic" : "New Topic"}
        </h3>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Topic title"
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
            placeholder="Add a question or description"
            rows={3}
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
