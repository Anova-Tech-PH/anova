"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, ModalOverlay } from "@attendly/ui/components";
import { createRoom, updateRoom } from "../actions";

type RoomData = {
  id: string;
  title: string;
  description: string | null;
  facilitator_name: string | null;
  location: string | null;
  max_capacity: number | null;
  starts_at: string;
  ends_at: string;
  session_id: string | null;
  status: string;
};

export function RoomForm({
  eventId,
  room,
  sessions,
  onClose,
}: {
  eventId: string;
  room: RoomData | null;
  sessions: { id: string; title: string }[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [hasCapacity, setHasCapacity] = useState(room?.max_capacity != null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      facilitator_name: (formData.get("facilitator_name") as string) || undefined,
      location: (formData.get("location") as string) || undefined,
      max_capacity: hasCapacity ? Number(formData.get("max_capacity")) : null,
      starts_at: formData.get("starts_at") as string,
      ends_at: formData.get("ends_at") as string,
      session_id: (formData.get("session_id") as string) || null,
    };

    startTransition(async () => {
      try {
        if (room) {
          await updateRoom(eventId, room.id, data);
          toast.success("Room updated");
        } else {
          await createRoom(eventId, data);
          toast.success("Room created");
        }
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function toLocalInput(iso: string) {
    return iso ? new Date(iso).toISOString().slice(0, 16) : "";
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {room ? "Edit Room" : "Create Room"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input
              name="title"
              required
              defaultValue={room?.title ?? ""}
              placeholder="e.g. Networking Lounge"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              name="description"
              rows={2}
              defaultValue={room?.description ?? ""}
              placeholder="What is this room about?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Facilitator</label>
              <Input
                name="facilitator_name"
                defaultValue={room?.facilitator_name ?? ""}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input
                name="location"
                defaultValue={room?.location ?? ""}
                placeholder="e.g. Room 201"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Starts at *</label>
              <Input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={room ? toLocalInput(room.starts_at) : ""}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ends at *</label>
              <Input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={room ? toLocalInput(room.ends_at) : ""}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <input
              type="checkbox"
              checked={hasCapacity}
              onChange={(e) => setHasCapacity(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <span className="text-sm font-medium">Limit capacity</span>
              <p className="text-xs text-muted-foreground">
                Set a maximum number of participants
              </p>
            </div>
          </label>

          {hasCapacity && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Max capacity</label>
              <Input
                name="max_capacity"
                type="number"
                min={1}
                max={500}
                defaultValue={room?.max_capacity ?? 30}
              />
            </div>
          )}

          {sessions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Linked Session (optional)
              </label>
              <select
                name="session_id"
                defaultValue={room?.session_id ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Standalone room (no linked session)</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isPending ? "Saving..." : room ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
