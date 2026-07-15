"use client";

import { useTransition } from "react";
import { Users, Clock, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { joinRoom, leaveRoom } from "../actions";

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
  sessions: { id: string; title: string } | null;
  breakout_room_participants: { id: string; user_id: string }[];
};

export function RoomCard({
  room,
  currentUserId,
}: {
  room: Room;
  currentUserId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const isJoined = currentUserId
    ? room.breakout_room_participants.some((p) => p.user_id === currentUserId)
    : false;
  const participantCount = room.breakout_room_participants.length;
  const isFull = room.max_capacity ? participantCount >= room.max_capacity : false;
  const isClosed = room.status === "closed";

  function handleToggle() {
    if (!currentUserId) {
      toast.error("Sign in to join rooms");
      return;
    }
    startTransition(async () => {
      try {
        if (isJoined) {
          await leaveRoom(room.id);
          toast.success("Left room");
        } else {
          await joinRoom(room.id);
          toast.success("Joined room");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{room.title}</h3>
          {room.sessions && (
            <p className="text-xs text-muted-foreground">Session: {room.sessions.title}</p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isClosed ? "bg-gray-100 text-gray-700"
            : isFull ? "bg-yellow-100 text-yellow-700"
            : "bg-green-100 text-green-700"
        }`}>
          {isClosed ? "Closed" : isFull ? "Full" : "Open"}
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
        {room.facilitator_name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {room.facilitator_name}
          </span>
        )}
        {room.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {room.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {participantCount}{room.max_capacity ? ` / ${room.max_capacity}` : ""}
        </span>
      </div>

      {currentUserId && !isClosed && (
        <button
          onClick={handleToggle}
          disabled={isPending || (!isJoined && isFull)}
          className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            isJoined
              ? "border hover:bg-accent"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isPending ? "..." : isJoined ? "Leave Room" : isFull ? "Full" : "Join Room"}
        </button>
      )}
    </div>
  );
}
