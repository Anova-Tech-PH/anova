"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/shared/components/ui";
import { sendBroadcastEmail } from "../actions";

type TicketType = {
  id: string;
  name: string;
};

export function ComposeEmail({
  eventId,
  ticketTypes,
  onClose,
  onSent,
}: {
  eventId: string;
  ticketTypes: TicketType[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const statuses = [
    { value: "confirmed", label: "Confirmed" },
    { value: "checked_in", label: "Checked In" },
    { value: "pending", label: "Pending" },
    { value: "cancelled", label: "Cancelled" },
  ];

  async function handleSend() {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    if (!confirm("Send this email to the selected recipients?")) return;

    setLoading(true);
    try {
      const result = await sendBroadcastEmail({
        eventId,
        subject,
        bodyHtml: `<div style="font-family: system-ui, sans-serif;">${bodyHtml.replace(/\n/g, "<br/>")}</div>`,
        filters: {
          ticket_type_ids: selectedTicketTypes.length > 0 ? selectedTicketTypes : undefined,
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        },
      });
      toast.success(`Sent ${result.sentCount} emails (${result.failedCount} failed)`);
      onSent();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send emails");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Compose Broadcast Email</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important update about {{event_name}}"
            />
            <p className="text-xs text-muted-foreground">
              Supports variables: {"{{attendee_name}}"}, {"{{event_name}}"}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message *</label>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={8}
              placeholder="Write your email message here..."
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Audience Filters (optional)</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ticket Types</label>
              <div className="flex flex-wrap gap-2">
                {ticketTypes.map((tt) => (
                  <label key={tt.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTicketTypes.includes(tt.id)}
                      onChange={(e) =>
                        setSelectedTicketTypes((prev) =>
                          e.target.checked
                            ? [...prev, tt.id]
                            : prev.filter((id) => id !== tt.id)
                        )
                      }
                      className="rounded"
                    />
                    {tt.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <label key={s.value} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(s.value)}
                      onChange={(e) =>
                        setSelectedStatuses((prev) =>
                          e.target.checked
                            ? [...prev, s.value]
                            : prev.filter((v) => v !== s.value)
                        )
                      }
                      className="rounded"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading || !subject.trim() || !bodyHtml.trim()}>
              <Send className="h-4 w-4" />
              {loading ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
