import { getCheckInStats } from "../queries";
import { Card } from "@/shared/components/ui";
import { BarChart3 } from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function CheckInStats({ eventId }: { eventId: string }) {
  const stats = await getCheckInStats(eventId);

  if (stats.perSession.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">Check-in Analytics</h3>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{stats.uniqueAttendees}</span> of{" "}
        <span className="font-semibold text-foreground">{stats.totalRegistered}</span> registered
        attendees have at least one check-in.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Session</th>
              <th className="pb-2 pr-4 font-medium">Date/Time</th>
              <th className="pb-2 font-medium text-right">Checked In</th>
            </tr>
          </thead>
          <tbody>
            {stats.perSession.map((session) => (
              <tr key={session.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{session.title}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatTime(session.start_time)}
                </td>
                <td className="py-2 text-right font-semibold">{session.checked_in_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
