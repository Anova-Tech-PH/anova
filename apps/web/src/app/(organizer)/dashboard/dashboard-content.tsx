"use client";

import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Badge, Button } from "@attendly/ui/components";

type EventRow = {
  id: string;
  title: string;
  status: string;
  start_date: string;
  venue_name: string | null;
  registrations_count: number;
};

type Stats = {
  totalEvents: number;
  totalRegistrations: number;
  upcomingEvents: number;
  checkInRate: number;
  recentEvents: EventRow[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayLabel(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

export function DashboardContent({
  userName,
  stats,
}: {
  userName?: string;
  stats: Stats;
}) {
  return (
    <div className="space-y-6">
      {/* ── Today strip (demo / happening-now) ── */}
      <div className="flex items-center justify-between rounded-[10px] bg-primary p-5 px-6 text-white">
        {/* Left */}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
            HAPPENING NOW &middot; {getTodayLabel()}
          </p>
          <h2 className="mt-1 font-display text-[28px] font-extrabold leading-tight">
            {userName ? `Welcome back, ${userName}` : "Welcome back"}
          </h2>
          <p className="mt-0.5 text-[14px] text-white/[0.85]">
            Main stage &middot; Keynote in progress
          </p>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-5">
          <div className="text-right">
            <p className="font-display text-[32px] font-extrabold tabular-nums leading-none">
              612
            </p>
            <p className="mt-0.5 text-[13px] text-white/[0.7]">/ in the room</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Open door mode
          </Button>
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-[10px] border border-border">
        {[
          { label: "Registered this month", value: stats.totalRegistrations.toLocaleString() },
          { label: "Turned up", value: `${stats.checkInRate}%` },
          { label: "First-time guests", value: "147" },
          { label: "Volunteers online", value: "3" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`p-4 px-5 ${i > 0 ? "border-l border-border" : ""}`}
          >
            <p className="text-[12px] font-semibold text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-[30px] font-extrabold tabular-nums leading-none tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Events table ── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          All Events
        </p>

        {stats.recentEvents.length === 0 ? (
          <div className="rounded-[10px] border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">No events yet</p>
            <Link
              href="/events/new"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Create one now
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border border-border">
            {/* Header */}
            <div className="flex items-center bg-[oklch(0.955_0.006_250)] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <span className="flex-1">Event</span>
              <span className="w-[200px]">Venue</span>
              <span className="w-[130px]">Date</span>
              <span className="w-[110px] text-right">Registered</span>
              <span className="w-[90px] text-right">Status</span>
            </div>

            {/* Rows */}
            {stats.recentEvents.map((event) => {
              const isLive = event.status === "live";
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className={`flex items-center border-t border-border/60 px-5 py-3.5 transition-colors hover:bg-muted/30 ${
                    isLive ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-[14px] font-bold">
                      {event.title}
                    </span>
                  </span>
                  <span className="w-[200px] truncate text-[13px] text-muted-foreground">
                    {event.venue_name ?? "---"}
                  </span>
                  <span className="w-[130px] text-[13px] text-muted-foreground">
                    {formatDate(event.start_date)}
                  </span>
                  <span className="w-[110px] text-right font-display text-[14px] font-bold tabular-nums">
                    {event.registrations_count.toLocaleString()}
                  </span>
                  <span className="w-[90px] text-right">
                    {isLive ? (
                      <Badge variant="live">Live</Badge>
                    ) : event.status === "published" ? (
                      <Badge variant="success">Open</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
