"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { createMeetup, updateMeetup } from "@/features/meetups/actions";
import type { Meetup } from "@/features/meetups/queries";
import { toast } from "sonner";

interface MeetupComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  draft?: Meetup | null;
}

export function MeetupComposer({
  eventId,
  open,
  onClose,
  draft,
}: MeetupComposerProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!draft;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    if (!open) return;

    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description ?? "");
      const d = new Date(draft.starts_at);
      setDate(d.toISOString().split("T")[0]);
      setStartTime(d.toTimeString().slice(0, 5));
      if (draft.ends_at) {
        const e = new Date(draft.ends_at);
        setEndTime(e.toTimeString().slice(0, 5));
      } else {
        setEndTime("");
      }
      setLocation(draft.location ?? "");
      setCapacity(draft.capacity ? String(draft.capacity) : "");
    } else {
      setTitle("");
      setDescription("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setCapacity("");
    }
  }, [open, draft]);

  function buildStartsAt(): string {
    if (!date || !startTime) return new Date().toISOString();
    return new Date(`${date}T${startTime}`).toISOString();
  }

  function buildEndsAt(): string | undefined {
    if (!date || !endTime) return undefined;
    return new Date(`${date}T${endTime}`).toISOString();
  }

  function handleSubmit() {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || undefined,
          starts_at: buildStartsAt(),
          ends_at: buildEndsAt(),
          location: location.trim() || undefined,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
        };

        if (isEditing) {
          await updateMeetup(eventId, draft.id, payload);
          toast.success("Meet-up updated");
        } else {
          await createMeetup(eventId, payload);
          toast.success("Meet-up created");
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
          {isEditing ? "Edit Meet-up" : "New Meet-up"}
        </h3>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meet-up title"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your meet-up..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="meetup-date" className="mb-1.5 block text-sm font-medium">
              Date *
            </label>
            <input
              id="meetup-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="meetup-start-time" className="mb-1.5 block text-sm font-medium">
              Start time *
            </label>
            <input
              id="meetup-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="meetup-end-time" className="mb-1.5 block text-sm font-medium">
              End time
            </label>
            <input
              id="meetup-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Location</label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Room or venue name"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Capacity</label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Unlimited"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />
            {isPending
              ? isEditing ? "Saving..." : "Creating..."
              : isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
