"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { createInterest, updateInterest } from "@/features/matchmaking/actions";
import { toast } from "sonner";

interface InterestDraft {
  id: string;
  name: string;
}

interface InterestComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  draft?: InterestDraft | null;
}

export function InterestComposer({
  eventId,
  open,
  onClose,
  draft,
}: InterestComposerProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!draft;
  const MAX_LENGTH = 30;

  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;

    if (draft) {
      setName(draft.name);
    } else {
      setName("");
    }
  }, [open, draft]);

  function handleNameChange(value: string) {
    if (value.length <= MAX_LENGTH) {
      setName(value);
    }
  }

  function handleSubmit() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateInterest(eventId, draft.id, { name: name.trim() });
          toast.success("Interest updated");
        } else {
          await createInterest(eventId, { name: name.trim() });
          toast.success("Interest created");
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
          {isEditing ? "Edit Interest" : "New Interest"}
        </h3>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Name *</label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Interest name"
            required
            maxLength={MAX_LENGTH}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {name.length}/{MAX_LENGTH}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
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
