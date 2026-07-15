"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { updateRegistrationStatus } from "../actions";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";

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

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Checked In", value: stats.checked_in },
          { label: "Cancelled", value: stats.cancelled },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <Button onClick={exportCsv} variant="outline">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Ticket</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Registered</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {registrations.length === 0
                    ? "No registrations yet"
                    : "No results match your search"}
                </td>
              </tr>
            ) : (
              filtered.map((reg) => (
                <tr key={reg.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{reg.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{reg.email}</td>
                  <td className="px-4 py-3">{reg.ticket_types?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[reg.status] ?? "default"}>
                      {reg.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(reg.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <select
                        value={reg.status}
                        onChange={(e) => handleStatusChange(reg.id, e.target.value)}
                        disabled={isPending}
                        className="rounded border bg-background px-2 py-1 text-xs outline-none"
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {registrations.length} registrations
      </p>
    </div>
  );
}
