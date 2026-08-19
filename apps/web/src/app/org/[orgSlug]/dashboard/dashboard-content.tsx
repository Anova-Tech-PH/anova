"use client";

import Link from "next/link";
import { Calendar, Users, TrendingUp, ScanLine, ArrowRight, Plus } from "lucide-react";
import { Badge } from "@attendly/ui/components";
import { Button } from "@attendly/ui/components";

type RecentEvent = {
  id: string;
  title: string;
  status: string;
  start_date: string;
  registrations_count: number;
};

type Stats = {
  totalEvents: number;
  totalRegistrations: number;
  upcomingEvents: number;
  checkInRate: number;
  recentEvents: RecentEvent[];
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DashboardContent({
  userName,
  stats,
  orgSlug,
}: {
  userName?: string;
  stats: Stats;
  orgSlug: string;
}) {
  return (
    <div className="space-y-10">
      {/* Header row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-1">
            {getFormattedDate()}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}{userName ? `, ${userName}` : ""}
          </h1>
        </div>
        <Link href={`/org/${orgSlug}/events/new`}>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Stats — simple row, no cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-lg border bg-border overflow-hidden">
        {[
          { label: "Events", value: stats.totalEvents, icon: Calendar },
          { label: "Registrations", value: stats.totalRegistrations, icon: Users },
          { label: "Upcoming", value: stats.upcomingEvents, icon: TrendingUp },
          { label: "Check-in rate", value: `${stats.checkInRate}%`, icon: ScanLine },
        ].map((stat) => (
          <div key={stat.label} className="bg-card px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent events */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent Events</h2>
          <Link
            href={`/org/${orgSlug}/events`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {stats.recentEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">No events yet</p>
            <Link href={`/org/${orgSlug}/events/new`} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
              Create one now
            </Link>
          </div>
        ) : (
          <>
          {/* Mobile: list view */}
          <div className="space-y-3 sm:hidden">
            {stats.recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/org/${orgSlug}/events/${event.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:border-primary/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium truncate">{event.title}</p>
                  <Badge
                    variant={
                      event.status === "published" ? "success"
                        : event.status === "draft" ? "warning"
                        : "default"
                    }
                    className="shrink-0 text-[11px] capitalize"
                  >
                    {event.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(event.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.registrations_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table view */}
          <div className="hidden rounded-lg border overflow-hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Event</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Registrations</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/org/${orgSlug}/events/${event.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {event.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          event.status === "published" ? "success"
                            : event.status === "draft" ? "warning"
                            : "default"
                        }
                        className="text-[11px] capitalize"
                      >
                        {event.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {event.registrations_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
