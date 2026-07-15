"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, Download, ChevronDown, Users, UserCheck, UserX, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { updateRegistrationStatus } from "../actions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";

type Registration = {
  id: string;
  name: string;
  email: string;
  status: string;
  qr_code: string;
  checked_in_at: string | null;
  created_at: string;
  ticket_types: { name: string; type: string; price: number } | null;
};

const statusVariants: Record<string, "success" | "info" | "destructive" | "warning"> = {
  confirmed: "success",
  checked_in: "info",
  cancelled: "destructive",
  pending: "warning",
};

const statusDotColors: Record<string, string> = {
  confirmed: "bg-emerald-500",
  checked_in: "bg-blue-500",
  cancelled: "bg-red-500",
  pending: "bg-amber-500",
};

export function RegistrationsTable({
  eventId,
  initialRegistrations,
}: {
  eventId: string;
  initialRegistrations: Registration[];
}) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [registrations, search, statusFilter]);

  const stats = useMemo(() => {
    const s = { total: registrations.length, confirmed: 0, checked_in: 0, cancelled: 0 };
    for (const r of registrations) {
      if (r.status === "confirmed") s.confirmed++;
      if (r.status === "checked_in") s.checked_in++;
      if (r.status === "cancelled") s.cancelled++;
    }
    return s;
  }, [registrations]);

  function handleStatusChange(regId: string, newStatus: string) {
    startTransition(async () => {
      try {
        await updateRegistrationStatus(eventId, regId, newStatus);
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === regId
              ? {
                  ...r,
                  status: newStatus,
                  checked_in_at: newStatus === "checked_in" ? new Date().toISOString() : r.checked_in_at,
                }
              : r
          )
        );
        toast.success("Status updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  function exportCsv() {
    const headers = ["Name", "Email", "Ticket", "Status", "Checked In At", "Registered At"];
    const rows = filtered.map((r) => [
      r.name,
      r.email,
      r.ticket_types?.name ?? "",
      r.status,
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : "",
      new Date(r.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    {
      label: "Total",
      value: stats.total,
      icon: Users,
      gradient: "from-slate-50 to-slate-100/80 dark:from-slate-900/40 dark:to-slate-800/30",
      iconColor: "text-slate-600 dark:text-slate-400",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle,
      gradient: "from-emerald-50 to-emerald-100/80 dark:from-emerald-900/30 dark:to-emerald-800/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Checked In",
      value: stats.checked_in,
      icon: UserCheck,
      gradient: "from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Cancelled",
      value: stats.cancelled,
      icon: UserX,
      gradient: "from-red-50 to-red-100/80 dark:from-red-900/30 dark:to-red-800/20",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={cn(
              "relative overflow-hidden border p-4 bg-gradient-to-br",
              s.gradient
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{s.value}</p>
              </div>
              <div className={cn("rounded-lg bg-white/60 p-2 dark:bg-white/10", s.iconColor)}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                "h-9 appearance-none rounded-lg border bg-background pl-3 pr-9 text-sm",
                "outline-none transition-colors",
                "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "hover:border-foreground/30"
              )}
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <Button onClick={exportCsv} variant="outline" className="gap-2 font-medium shadow-sm">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60">
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                Email
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                Ticket
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                Registered
              </th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                    <p className="font-medium">
                      {registrations.length === 0
                        ? "No registrations yet"
                        : "No results match your search"}
                    </p>
                    {registrations.length > 0 && (
                      <p className="text-xs">Try adjusting your filters</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((reg, index) => (
                <tr
                  key={reg.id}
                  className={cn(
                    "transition-colors hover:bg-primary/[0.04]",
                    index % 2 === 1 && "bg-muted/20"
                  )}
                >
                  <td className="px-4 py-3.5">
                    <div>
                      <span className="font-medium">{reg.name}</span>
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {reg.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">
                    {reg.email}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {reg.ticket_types?.name ? (
                      <Badge variant="default">{reg.ticket_types.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          statusDotColors[reg.status] ?? "bg-gray-400"
                        )}
                      />
                      <span className="text-sm capitalize">
                        {reg.status.replace("_", " ")}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">
                    {new Date(reg.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="relative inline-block">
                      <select
                        value={reg.status}
                        onChange={(e) => handleStatusChange(reg.id, e.target.value)}
                        disabled={isPending}
                        className={cn(
                          "h-8 appearance-none rounded-md border bg-background pl-2.5 pr-7 text-xs font-medium",
                          "outline-none transition-all",
                          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                          "hover:border-foreground/30 hover:bg-muted/30",
                          "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {registrations.length} registration{registrations.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
