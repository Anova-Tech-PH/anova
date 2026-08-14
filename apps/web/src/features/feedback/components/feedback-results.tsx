import { Badge } from "@attendly/ui/components";
import { FeedbackDownloadButton } from "./feedback-download-button";

type SessionSummary = {
  session_id: string;
  title: string;
  start_time: string;
  response_count: number;
  avg_rating: number;
  has_form: boolean;
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= Math.round(rating)
              ? "text-yellow-500"
              : "text-muted-foreground/30"
          }
        >
          &#9733;
        </span>
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : "--"}
      </span>
    </span>
  );
}

export function FeedbackResults({
  summaries,
  eventId,
}: {
  summaries: SessionSummary[];
  eventId: string;
}) {
  const sorted = [...summaries].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
        No sessions found. Add sessions to the schedule to start collecting
        feedback.
      </div>
    );
  }

  const hasAnyFeedback = sorted.some((s) => s.response_count > 0);

  if (!hasAnyFeedback) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
        No feedback responses yet. Responses will appear here once attendees
        submit session feedback.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-end px-4 py-2 border-b bg-muted/10">
        <FeedbackDownloadButton eventId={eventId} />
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Session Name</th>
            <th className="px-4 py-3 text-left font-medium">Date/Time</th>
            <th className="px-4 py-3 text-center font-medium">Responses</th>
            <th className="px-4 py-3 text-left font-medium">Avg Rating</th>
            <th className="px-4 py-3 text-center font-medium">Has Form</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.session_id} className="border-b last:border-b-0">
              <td className="px-4 py-3 font-medium">{s.title}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(s.start_time).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 text-center">{s.response_count}</td>
              <td className="px-4 py-3">
                <StarDisplay rating={s.avg_rating} />
              </td>
              <td className="px-4 py-3 text-center">
                <Badge variant={s.has_form ? "success" : "outline"}>
                  {s.has_form ? "Yes" : "No"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
