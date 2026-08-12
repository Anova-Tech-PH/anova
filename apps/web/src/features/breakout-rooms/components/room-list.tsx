"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Users, Clock, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteRoom } from "../actions";
import { RoomForm } from "./room-form";
import { Badge, Button, Card, useConfirm } from "@attendly/ui/components";

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
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleDelete(roomId: string) {
    const ok = await confirm({
      title: "Delete Room",
      description: "Delete this breakout room? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
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
        <Button onClick={() => { setEditingRoom(null); setShowForm(true); }}>
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No breakout rooms</p>
          <p className="mt-1 text-sm text-muted-foreground">Add rooms for smaller discussions or workshops within this event.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <Card key={room.id} className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{room.title}</h3>
                  <Badge variant={room.status === "open" ? "success" : room.status === "full" ? "warning" : "default"}>
                    {room.status}
                  </Badge>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditingRoom(room); setShowForm(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(room.id)}
                  disabled={isPending}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
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

      {confirmDialog}
    </div>
  );
}
