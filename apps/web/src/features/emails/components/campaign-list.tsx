"use client";

import Link from "next/link";

type Campaign = {
  id: string;
  subject: string;
  recipient_source: string;
  contact_lists: { name: string } | null;
  status: string;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  sending: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-700",
};

export function CampaignList({ campaigns, eventId }: { campaigns: Campaign[]; eventId: string }) {
  if (campaigns.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No campaigns yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Subject</th>
            <th className="px-4 py-2.5 text-left font-medium">Audience</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Sent</th>
            <th className="px-4 py-2.5 text-left font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link
                  href={`/events/${eventId}/emails/campaigns/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.subject?.replace(/\{\{[^}]+\}\}/g, "...") || "(No subject)"}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {c.recipient_source === "contact_list"
                  ? c.contact_lists?.name ?? "Contact List"
                  : "Registered Attendees"}
              </td>
              <td className="px-4 py-2.5">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.status] ?? statusColors.draft}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{c.sent_count}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {c.sent_at
                  ? new Date(c.sent_at).toLocaleDateString()
                  : new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
