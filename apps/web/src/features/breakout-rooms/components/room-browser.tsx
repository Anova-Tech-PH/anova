"use client";

import { useState } from "react";
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
  const filtered = rooms.filter((room) => {
    if (filter === "all") return true;
    const start = new Date(room.starts_at);
    const end = new Date(room.ends_at);
    if (filter === "upcoming") return start > now;
    if (filter === "active") return start <= now && end >= now;
    if (filter === "past") return end < now;
    return true;
  });

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "active", label: "Active Now" },
    { value: "past", label: "Past" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Breakout Rooms</h1>
      </div>

      <div className="flex gap-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No rooms found</p>
        </div>
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
