"use client";

import Link from "next/link";
import { Calendar, Users, TrendingUp, ScanLine, ArrowRight } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { StaggerList, StaggerItem } from "@/shared/components/ui/stagger-list";

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

const statCardConfig = [
  { key: "totalEvents" as const, label: "Total Events", icon: Calendar, color: "border-l-primary" },
  { key: "totalRegistrations" as const, label: "Total Registrations", icon: Users, color: "border-l-info" },
  { key: "upcomingEvents" as const, label: "Upcoming Events", icon: TrendingUp, color: "border-l-success" },
  { key: "checkInRate" as const, label: "Check-in Rate", icon: ScanLine, color: "border-l-warning", suffix: "%" },
];

export function DashboardContent({
  userName,
  stats,
}: {
  userName?: string;
  stats: Stats;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back{userName ? `, ${userName}` : ""}.
        </p>
      </div>

      {/* Stats */}
      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCardConfig.map((config) => (
          <StaggerItem key={config.key}>
            <Card className={`border-l-4 ${config.color} p-6`}>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{config.label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <config.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-semibold">
                {stats[config.key]}{config.suffix ?? ""}
              </p>
            </Card>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Recent events */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <Link
            href="/events"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {stats.recentEvents.length === 0 ? (
          <EmptyState
            title="No events yet."
            action={
              <Link href="/events/new" className="text-primary text-sm font-medium hover:underline">
                Create your first event
              </Link>
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Event</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents.map((event) => (
                    <tr key={event.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            event.status === "published"
                              ? "success"
                              : event.status === "draft"
                                ? "warning"
                                : "default"
                          }
                        >
                          {event.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {event.registrations_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
