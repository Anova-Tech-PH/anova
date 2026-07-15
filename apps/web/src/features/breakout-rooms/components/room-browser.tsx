"use client";

import { useState, useMemo } from "react";
import { DoorOpen } from "lucide-react";
import { EmptyState } from "@/shared/components/ui";
import { RoomCard } from "./room-card";

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

type Filter = "all" | "upcoming" | "active" | "past";

export function RoomBrowser({
  rooms,
  currentUserId,
}: {
  rooms: Room[];
  currentUserId: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const now = new Date();

  const filterFn = (room: Room, f: Filter) => {
    if (f === "all") return true;
    const start = new Date(room.starts_at);
    const end = new Date(room.ends_at);
    if (f === "upcoming") return start > now;
    if (f === "active") return start <= now && end >= now;
    if (f === "past") return end < now;
    return true;
  };

  const filtered = rooms.filter((room) => filterFn(room, filter));

  const counts = useMemo(() => ({
    all: rooms.length,
    upcoming: rooms.filter((r) => filterFn(r, "upcoming")).length,
    active: rooms.filter((r) => filterFn(r, "active")).length,
    past: rooms.filter((r) => filterFn(r, "past")).length,
  }), [rooms]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "active", label: "Active Now" },
    { value: "past", label: "Past" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Breakout Rooms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join focused discussion groups and collaborative sessions
        </p>
      </div>

      <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              filter === f.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                filter === f.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="h-8 w-8" />}
          title="No rooms found"
          description={
            filter === "all"
              ? "There are no breakout rooms available yet."
              : `No ${filter} rooms right now. Try a different filter.`
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
