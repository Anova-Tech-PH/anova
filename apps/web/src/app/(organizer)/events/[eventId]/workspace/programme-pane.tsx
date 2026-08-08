"use client";

import { useState } from "react";
import { ScanLine, Plus } from "lucide-react";
import Link from "next/link";

type Session = {
  id: string;
  title: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  enable_check_in: boolean;
  track: { id: string; name: string; color: string }[] | { id: string; name: string; color: string } | null;
};

interface ProgrammePaneProps {
  sessions: Session[];
  eventId: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getSessionState(session: Session): "past" | "live" | "upcoming" | "break" {
  if (session.type === "break") return "break";
  const now = new Date();
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  if (now >= start && now <= end) return "live";
  if (now > end) return "past";
  return "upcoming";
}

export function ProgrammePane({ sessions, eventId }: ProgrammePaneProps) {
  // Group sessions by day
  const days = new Map<string, Session[]>();
  for (const s of sessions) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(s);
  }
  const dayKeys = Array.from(days.keys());
  const [selectedDay, setSelectedDay] = useState(0);
  const currentSessions = days.get(dayKeys[selectedDay] ?? "") ?? sessions;

  return (
    <div className="border-r border-border-subtle p-4 lg:p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Programme</span>
        {dayKeys.length > 1 && (
          <div className="flex rounded-[5px] border border-border overflow-hidden">
            {dayKeys.map((day, i) => (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={`px-3 py-1 text-[12px] font-semibold transition-colors ${
                  i === selectedDay
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Day {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
        {currentSessions.map((session) => {
          const state = getSessionState(session);
          return (
            <div
              key={session.id}
              className={`rounded-[7px] border border-border p-3.5 border-l-[3px] transition-all ${
                state === "past" ? "opacity-60 border-l-[oklch(0.86_0.015_250)]" : ""
              } ${
                state === "live" ? "border-primary bg-primary/5 border-l-primary" : ""
              } ${
                state === "upcoming" ? "border-l-primary" : ""
              } ${
                state === "break" ? "bg-[oklch(0.965_0.006_250)] border-l-[oklch(0.86_0.015_250)]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className={`text-[15px] font-bold ${state === "live" ? "font-extrabold" : ""} ${state === "break" ? "text-muted-foreground italic" : ""}`}>
                    {session.title}
                  </div>
                  {session.location && (
                    <div className="text-[12px] text-muted-foreground mt-0.5">{session.location}</div>
                  )}
                  {state === "live" && (
                    <div className="flex items-center gap-3 mt-2">
                      <Link
                        href={`/door/${eventId}`}
                        className="flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline"
                      >
                        <ScanLine className="h-3.5 w-3.5" />
                        Scan at this door
                      </Link>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-bold tabular-nums">{formatTime(session.start_time)}</div>
                  {state === "break" && <div className="text-[11px] text-muted-foreground">no check-in</div>}
                </div>
              </div>
            </div>
          );
        })}
        {/* Add session affordance */}
        <div className="rounded-[7px] border border-dashed border-border p-3.5 text-center text-[13px] text-muted-foreground cursor-pointer hover:border-primary/30 transition-colors">
          <Plus className="inline h-3.5 w-3.5 mr-1" />
          Add a session
        </div>
      </div>
    </div>
  );
}
