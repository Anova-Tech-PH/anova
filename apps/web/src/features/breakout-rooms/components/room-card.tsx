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

  const statusColor = isClosed
    ? "bg-gray-400"
    : isFull
      ? "bg-amber-400"
      : "bg-emerald-400";

  const capacityPercent = room.max_capacity
    ? Math.min(100, Math.round((participantCount / room.max_capacity) * 100))
    : 0;

  return (
    <Card className="overflow-hidden p-0 space-y-0">
      {/* Status stripe */}
      <div className={`h-1 w-full ${statusColor}`} />

      {/* Header area with subtle gradient */}
      <div className="bg-gradient-to-b from-muted/40 to-transparent px-5 pt-4 pb-3 space-y-1">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">{room.title}</h3>
            {room.sessions && (
              <p className="text-xs text-muted-foreground">Session: {room.sessions.title}</p>
            )}
          </div>
          <Badge
            variant={isClosed ? "default" : isFull ? "warning" : "success"}
            className="flex items-center gap-1.5 shrink-0"
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isClosed ? "bg-gray-100" : isFull ? "bg-amber-100" : "bg-emerald-100"
              }`}
            />
            {isClosed ? "Closed" : isFull ? "Full" : "Open"}
          </Badge>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3">
        {room.description && (
          <p className="text-sm text-muted-foreground">{room.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1">
            <Clock className="h-3 w-3" />
            {new Date(room.starts_at).toLocaleString()} - {new Date(room.ends_at).toLocaleTimeString()}
          </span>
          {room.facilitator_name && (
            <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1">
              <User className="h-3 w-3" />
              {room.facilitator_name}
            </span>
          )}
          {room.location && (
            <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1">
              <MapPin className="h-3 w-3" />
              {room.location}
            </span>
          )}
        </div>

        {/* Participant count with capacity bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {participantCount}{room.max_capacity ? ` / ${room.max_capacity}` : ""} participants
            </span>
            {room.max_capacity ? (
              <span className="text-muted-foreground font-medium">{capacityPercent}%</span>
            ) : null}
          </div>
          {room.max_capacity ? (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFull ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          ) : null}
        </div>

        {currentUserId && !isClosed && (
          <Button
            onClick={handleToggle}
            disabled={isPending || (!isJoined && isFull)}
            variant={isJoined ? "outline" : "primary"}
            className="w-full transition-all duration-200 hover:shadow-md active:scale-[0.98]"
          >
            {isPending ? "..." : isJoined ? "Leave Room" : isFull ? "Full" : "Join Room"}
          </Button>
        )}
      </div>
    </Card>
  );
}
