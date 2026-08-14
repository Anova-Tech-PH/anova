"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@attendly/ui/components";
import { ModalOverlay } from "@attendly/ui/components";
import { createTopic } from "@/features/community/actions";
import { toast } from "sonner";

interface CreateTopicDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
}

const topicTypes = [
  { value: "discussion", label: "Discussion" },
  { value: "announcement", label: "Announcement" },
  { value: "meetup", label: "Meetup" },
  { value: "ask_organizer", label: "Ask Organizer" },
] as const;

export function CreateTopicDialog({
  eventId,
  open,
  onClose,
}: CreateTopicDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<
    "discussion" | "announcement" | "meetup" | "ask_organizer"
  >("discussion");
  const [description, setDescription] = useState("");
  const [meetupDate, setMeetupDate] = useState("");
  const [meetupLocation, setMeetupLocation] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setType("discussion");
    setDescription("");
    setMeetupDate("");
    setMeetupLocation("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      try {
        await createTopic(eventId, {
          title: title.trim(),
          type,
          description: description.trim() || undefined,
          meetup_date: type === "meetup" && meetupDate ? meetupDate : undefined,
          meetup_location:
            type === "meetup" && meetupLocation.trim()
              ? meetupLocation.trim()
              : undefined,
        });
        toast.success("Topic created!");
        resetForm();
        onClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create topic"
        );
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Create New Topic</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {topicTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details (optional)"
              rows={3}
            />
          </div>

          {type === "meetup" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Meetup Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={meetupDate}
                  onChange={(e) => setMeetupDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Location
                </label>
                <Input
                  value={meetupLocation}
                  onChange={(e) => setMeetupLocation(e.target.value)}
                  placeholder="Where will you meet?"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Creating..." : "Create Topic"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
