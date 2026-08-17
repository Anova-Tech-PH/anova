"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@attendly/ui/components";
import { updateSessionCapacity } from "../actions";
import type { RsvpSummary } from "../queries";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
  const pct = Math.min((confirmed / capacity) * 100, 100);
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function RsvpDashboard({ eventId, summaries: initialSummaries }: { eventId: string; summaries: RsvpSummary[] }) {
  const [summaries, setSummaries] = useState(initialSummaries);

  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="text-sm">No sessions found. Create sessions in the Schedule tab first.</p>
      </div>
    );
  }

  async function handleToggle(sessionId: string, currentEnabled: boolean) {
    const session = summaries.find((s) => s.session_id === sessionId);
    if (!session) return;

    try {
      await updateSessionCapacity(eventId, sessionId, {
        capacity: session.capacity,
        rsvp_enabled: !currentEnabled,
      });
      setSummaries((prev) =>
        prev.map((s) =>
          s.session_id === sessionId ? { ...s, rsvp_enabled: !currentEnabled } : s
        )
      );
      toast.success(currentEnabled ? "RSVP disabled" : "RSVP enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  const enabledCount = summaries.filter((s) => s.rsvp_enabled).length;
  const totalRsvps = summaries.reduce((sum, s) => sum + s.confirmed_count, 0);
  const totalWaitlisted = summaries.reduce((sum, s) => sum + s.waitlisted_count, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">
          {enabledCount} of {summaries.length} sessions have RSVP enabled
        </span>
        <span className="text-muted-foreground">
          {totalRsvps} total RSVPs
        </span>
        {totalWaitlisted > 0 && (
          <span className="text-muted-foreground">
            {totalWaitlisted} waitlisted
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">RSVPs</th>
              <th className="px-4 py-3 font-medium">Waitlisted</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.session_id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{s.title}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatTime(s.start_time)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {s.capacity != null
                        ? `${s.confirmed_count}/${s.capacity}`
                        : `${s.confirmed_count}`}
                    </span>
                    {s.capacity != null && (
                      <CapacityBar confirmed={s.confirmed_count} capacity={s.capacity} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{s.waitlisted_count}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(s.session_id, s.rsvp_enabled)}
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={s.rsvp_enabled ? "success" : "outline"}
                    >
                      {s.rsvp_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
