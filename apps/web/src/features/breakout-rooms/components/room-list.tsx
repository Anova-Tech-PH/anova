"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Users, Clock, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteRoom } from "../actions";
import { RoomForm } from "./room-form";

type Room = {
  id: string;
  title: string;
  description: string | null;
  facilitator_name: string | null;
  location: string | null;
  max_capacity: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
  session_id: string | null;
  sessions: { id: string; title: string } | null;
  breakout_room_participants: { id: string }[];
};

export function RoomList({
  eventId,
  rooms,
  sessions,
}: {
  eventId: string;
  rooms: Room[];
  sessions: { id: string; title: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(roomId: string) {
    if (!confirm("Delete this breakout room?")) return;
    startTransition(async () => {
      try {
        await deleteRoom(eventId, roomId);
        toast.success("Room deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Breakout Rooms</h2>
        <button
          onClick={() => { setEditingRoom(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No breakout rooms yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create rooms for discussions, networking, or post-session breakouts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-start justify-between rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{room.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    room.status === "open" ? "bg-green-100 text-green-700"
                      : room.status === "full" ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {room.status}
                  </span>
                </div>
                {room.description && (
                  <p className="text-sm text-muted-foreground">{room.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(room.starts_at).toLocaleString()} - {new Date(room.ends_at).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {room.breakout_room_participants.length}{room.max_capacity ? ` / ${room.max_capacity}` : ""} joined
                  </span>
                  {room.sessions && (
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {room.sessions.title}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingRoom(room); setShowForm(true); }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(room.id)}
                  disabled={isPending}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RoomForm
          eventId={eventId}
          room={editingRoom}
          sessions={sessions}
          onClose={() => { setShowForm(false); setEditingRoom(null); }}
        />
      )}
    </div>
  );
}
