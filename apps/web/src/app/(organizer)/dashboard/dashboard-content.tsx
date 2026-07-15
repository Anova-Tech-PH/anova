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
  {
    key: "totalEvents" as const,
    label: "Total Events",
    icon: Calendar,
    gradient: "from-[oklch(0.445_0.107_195/0.08)] to-[oklch(0.445_0.107_195/0.02)]",
    iconBg: "from-[oklch(0.445_0.107_195/0.2)] to-[oklch(0.445_0.107_195/0.08)]",
    iconColor: "text-[oklch(0.445_0.107_195)]",
    accentBorder: "border-l-[oklch(0.445_0.107_195)]",
    dotColor: "bg-[oklch(0.445_0.107_195)]",
    trend: "+2 this month",
  },
  {
    key: "totalRegistrations" as const,
    label: "Total Registrations",
    icon: Users,
    gradient: "from-[oklch(0.55_0.12_250/0.08)] to-[oklch(0.55_0.12_250/0.02)]",
    iconBg: "from-[oklch(0.55_0.12_250/0.2)] to-[oklch(0.55_0.12_250/0.08)]",
    iconColor: "text-[oklch(0.55_0.12_250)]",
    accentBorder: "border-l-[oklch(0.55_0.12_250)]",
    dotColor: "bg-[oklch(0.55_0.12_250)]",
    trend: "+12% vs last month",
  },
  {
    key: "upcomingEvents" as const,
    label: "Upcoming Events",
    icon: TrendingUp,
    gradient: "from-[oklch(0.55_0.15_155/0.08)] to-[oklch(0.55_0.15_155/0.02)]",
    iconBg: "from-[oklch(0.55_0.15_155/0.2)] to-[oklch(0.55_0.15_155/0.08)]",
    iconColor: "text-[oklch(0.55_0.15_155)]",
    accentBorder: "border-l-[oklch(0.55_0.15_155)]",
    dotColor: "bg-[oklch(0.55_0.15_155)]",
    trend: "Next one in 3 days",
  },
  {
    key: "checkInRate" as const,
    label: "Check-in Rate",
    icon: ScanLine,
    gradient: "from-[oklch(0.6_0.12_75/0.08)] to-[oklch(0.6_0.12_75/0.02)]",
    iconBg: "from-[oklch(0.6_0.12_75/0.2)] to-[oklch(0.6_0.12_75/0.08)]",
    iconColor: "text-[oklch(0.6_0.12_75)]",
    accentBorder: "border-l-[oklch(0.6_0.12_75)]",
    dotColor: "bg-[oklch(0.6_0.12_75)]",
    suffix: "%",
    trend: "+5% vs last month",
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500";
    case "draft":
      return "bg-amber-400";
    default:
      return "bg-gray-400";
  }
}

export function DashboardContent({
  userName,
  stats,
}: {
  userName?: string;
  stats: Stats;
}) {
  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {getFormattedDate()}
        </p>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{
            background: "linear-gradient(135deg, oklch(0.445 0.107 195), oklch(0.55 0.12 250))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {getGreeting()}{userName ? `, ${userName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your events today.
        </p>
      </div>

      {/* Stats */}
      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCardConfig.map((config) => (
          <StaggerItem key={config.key}>
            <Card
              className={`relative overflow-hidden border-l-4 ${config.accentBorder} p-6 bg-gradient-to-br ${config.gradient} transition-shadow hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${config.iconBg}`}
                >
                  <config.icon className={`h-5 w-5 ${config.iconColor}`} />
                </div>
              </div>
              <p className="mt-3 text-4xl font-bold tracking-tight">
                {stats[config.key]}{config.suffix ?? ""}
              </p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                {config.trend}
              </p>
            </Card>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Recent events */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent Events</h2>
          <Link
            href="/events"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Event
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Registrations
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/events/${event.id}`}
                          className="inline-flex items-center gap-2.5 font-medium hover:text-primary transition-colors"
                        >
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${getStatusDotColor(event.status)} shrink-0`}
                          />
                          {event.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            event.status === "published"
                              ? "success"
                              : event.status === "draft"
                                ? "warning"
                                : "default"
                          }
                          className="text-xs font-semibold capitalize"
                        >
                          {event.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(event.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold tabular-nums">
                          {event.registrations_count}
                        </span>
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
