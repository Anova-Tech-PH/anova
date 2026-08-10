import type { RsvpSummary } from "@/features/rsvp/queries";

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

export function RsvpDashboard({ summaries }: { summaries: RsvpSummary[] }) {
  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="text-sm">No sessions found. Create sessions in the Schedule tab first.</p>
      </div>
    );
  }

  return (
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
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.rsvp_enabled
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {s.rsvp_enabled ? "Enabled" : "Disabled"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
