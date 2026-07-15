"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{room ? "Edit Room" : "Create Room"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <input
              name="title"
              required
              defaultValue={room?.title ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={room?.description ?? ""}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Facilitator</label>
              <input
                name="facilitator_name"
                defaultValue={room?.facilitator_name ?? ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <input
                name="location"
                defaultValue={room?.location ?? ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Starts at *</label>
              <input
                name="starts_at"
                type="datetime-local"
                required
                defaultValue={room ? toLocalInput(room.starts_at) : ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ends at *</label>
              <input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={room ? toLocalInput(room.ends_at) : ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-capacity"
                checked={hasCapacity}
                onChange={(e) => setHasCapacity(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <label htmlFor="has-capacity" className="text-sm font-medium">Limit capacity</label>
            </div>
            {hasCapacity && (
              <input
                name="max_capacity"
                type="number"
                min={1}
                max={500}
                defaultValue={room?.max_capacity ?? 30}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          {sessions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Linked Session (optional)</label>
              <select
                name="session_id"
                defaultValue={room?.session_id ?? ""}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Standalone room (no linked session)</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Saving..." : room ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
