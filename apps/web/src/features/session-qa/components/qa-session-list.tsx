"use client";

import { useState } from "react";
import Link from "next/link";

type SessionWithCount = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  question_count: number;
};

export function QASessionList({
  myAgenda,
  other,
  eventSlug,
}: {
  myAgenda: SessionWithCount[];
  other: SessionWithCount[];
  eventSlug: string;
}) {
  const [search, setSearch] = useState("");

  const filterSessions = (sessions: SessionWithCount[]) =>
    sessions.filter((s) =>
      s.title.toLowerCase().includes(search.toLowerCase())
    );

  const filteredAgenda = filterSessions(myAgenda);
  const filteredOther = filterSessions(other);

  return (
    <div className="space-y-6">
      <input
        type="text"
        placeholder="Search sessions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {filteredAgenda.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Sessions from My Agenda
          </h3>
          <div className="space-y-2">
            {filteredAgenda.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                eventSlug={eventSlug}
              />
            ))}
          </div>
        </div>
      )}

      {filteredOther.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {filteredAgenda.length > 0 ? "Other Sessions" : "All Sessions"}
          </h3>
          <div className="space-y-2">
            {filteredOther.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                eventSlug={eventSlug}
              />
            ))}
          </div>
        </div>
      )}

      {filteredAgenda.length === 0 && filteredOther.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No sessions found.
        </p>
      )}
    </div>
  );
}

function SessionCard({
  session,
  eventSlug,
}: {
  session: SessionWithCount;
  eventSlug: string;
}) {
  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  const timeStr = `${startDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} ${startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  return (
    <Link
      href={`/events/${eventSlug}/qa/${session.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium truncate">{session.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{timeStr}</p>
        </div>
        <div className="ml-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{session.question_count}</span>
        </div>
      </div>
    </Link>
  );
}
