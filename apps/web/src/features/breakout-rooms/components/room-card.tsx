"use client";

import { useTransition } from "react";
import { Users, Clock, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { joinRoom, leaveRoom } from "../actions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

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
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{room.title}</h3>
          {room.sessions && (
            <p className="text-xs text-muted-foreground">Session: {room.sessions.title}</p>
          )}
        </div>
        <Badge variant={isClosed ? "default" : isFull ? "warning" : "success"}>
          {isClosed ? "Closed" : isFull ? "Full" : "Open"}
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
        <Button
          onClick={handleToggle}
          disabled={isPending || (!isJoined && isFull)}
          variant={isJoined ? "outline" : "primary"}
          className="w-full"
        >
          {isPending ? "..." : isJoined ? "Leave Room" : isFull ? "Full" : "Join Room"}
        </Button>
      )}
    </Card>
  );
}
