"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Wifi,
  Users,
  ArrowUpRight,
  LayoutGrid,
  List,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { Badge, Button } from "@attendly/ui/components";

type Event = {
  id: string;
  title: string;
  status: string;
  start_date: string;
  venue_name: string | null;
  is_virtual: boolean;
  cover_image: string | null;
};

type ViewMode = "cards" | "table";
type StatusFilter = "all" | "published" | "draft" | "cancelled" | "completed";

function getStatusStyle(status: string) {
  switch (status) {
    case "published":
      return {
        bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/40 dark:to-emerald-900/20",
        badge: "success" as const,
        label: "Published",
      };
    case "draft":
      return {
        bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-700/20",
        badge: "warning" as const,
        label: "Draft",
      };
    case "cancelled":
      return {
        bg: "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20",
        badge: "destructive" as const,
        label: "Cancelled",
      };
    case "completed":
      return {
        bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20",
        badge: "info" as const,
        label: "Completed",
      };
    default:
      return {
        bg: "bg-gradient-to-br from-muted to-muted/50",
        badge: "default" as const,
        label: status,
      };
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

export function EventsList({
  events,
  regCounts,
}: {
  events: Event[];
  regCounts: Record<string, number>;
}) {
  const [view, setView] = useState<ViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [events, statusFilter, search]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="space-y-3">
        {/* Row 1: Search + View toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-8 text-sm outline-none ring-ring focus:ring-2 sm:max-w-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View toggle (hidden on mobile — cards only) */}
          <div className="hidden shrink-0 items-center gap-1 rounded-md border bg-background p-0.5 sm:flex">
            <button
              onClick={() => setView("cards")}
              className={`rounded-sm p-1.5 transition-colors ${
                view === "cards"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`rounded-sm p-1.5 transition-colors ${
                view === "table"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Status filter */}
        {/* Mobile: select dropdown */}
        <div className="relative sm:hidden">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 w-full appearance-none rounded-md border bg-background pl-3 pr-9 text-sm font-medium outline-none ring-ring focus:ring-2"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === "all" ? "All statuses" : opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {/* Desktop: segmented buttons */}
        <div className="hidden items-center gap-1 rounded-md border bg-background p-0.5 sm:inline-flex">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`whitespace-nowrap rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(statusFilter !== "all" || search) && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {events.length} events
        </p>
      )}

      {/* Empty filtered state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No events match your filters.
          </p>
          <button
            onClick={() => {
              setStatusFilter("all");
              setSearch("");
            }}
            className="mt-2 text-sm font-medium text-primary underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Card view */}
      {filtered.length > 0 && view === "cards" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => {
            const style = getStatusStyle(event.status);
            const regCount = regCounts[event.id] ?? 0;

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/20"
              >
                <div
                  className={`relative flex h-28 items-center justify-center overflow-hidden ${event.cover_image ? "" : style.bg}`}
                >
                  {event.cover_image ? (
                    <img
                      src={event.cover_image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Calendar className="h-10 w-10 text-foreground/8" />
                  )}
                  {event.cover_image && (
                    <div className="absolute inset-0 bg-black/20" />
                  )}
                  <div className="absolute left-3 top-3 z-10">
                    <Badge variant={style.badge}>{style.label}</Badge>
                  </div>
                  <div className="absolute right-3 top-3 z-10">
                    <span className="flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm shadow-sm">
                      <Users className="h-3 w-3" />
                      {regCount}
                    </span>
                  </div>
                  <div className="absolute right-3 bottom-3 z-10 opacity-0 translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                    <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm">
                      Manage <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(event.start_date)}</span>
                    </div>
                    {event.venue_name ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.venue_name}</span>
                      </div>
                    ) : event.is_virtual ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wifi className="h-3.5 w-3.5 shrink-0" />
                        <span>Virtual Event</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Table view */}
      {filtered.length > 0 && view === "table" && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Event
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Location
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Registrations
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const style = getStatusStyle(event.status);
                const regCount = regCounts[event.id] ?? 0;

                return (
                  <tr
                    key={event.id}
                    className="group border-b last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/events/${event.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {event.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={style.badge}>{style.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(event.start_date)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.venue_name ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {event.venue_name}
                          </span>
                        </span>
                      ) : event.is_virtual ? (
                        <span className="flex items-center gap-1.5">
                          <Wifi className="h-3.5 w-3.5 shrink-0" />
                          Virtual
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {regCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
