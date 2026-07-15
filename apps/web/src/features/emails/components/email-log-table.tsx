"use client";

import { Badge } from "@/shared/components/ui/badge";

type EmailLog = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
};

const statusVariant: Record<string, "success" | "destructive" | "warning" | "default"> = {
  sent: "success",
  delivered: "success",
  failed: "destructive",
  bounced: "destructive",
  queued: "warning",
};

export function EmailLogTable({ logs }: { logs: EmailLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No emails sent yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Recipient</th>
            <th className="px-4 py-2.5 text-left font-medium">Subject</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Sent</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="px-4 py-2.5">
                <div className="font-medium">{log.recipient_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{log.recipient_email}</div>
              </td>
              <td className="px-4 py-2.5 max-w-[200px] truncate">{log.subject}</td>
              <td className="px-4 py-2.5">
                <Badge variant={statusVariant[log.status] ?? "default"}>
                  {log.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {log.sent_at
                  ? new Date(log.sent_at).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
