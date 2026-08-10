"use client";

import { useState, useTransition } from "react";
import { createAnnouncement, sendAnnouncement } from "@/features/announcements/actions";

export function AnnouncementComposer({ eventId, ticketTypes }: { eventId: string; ticketTypes: { id: string; name: string }[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<string[]>(["in_app"]);
  const [audience, setAudience] = useState<"all" | "ticket_types">("all");
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  function resetForm() {
    setSubject("");
    setBody("");
    setChannels(["in_app"]);
    setAudience("all");
    setSelectedTicketTypes([]);
  }

  function getTargetAudience() {
    return audience === "ticket_types" && selectedTicketTypes.length > 0
      ? { type: "ticket_types", ticket_type_ids: selectedTicketTypes }
      : { type: "all" };
  }

  function handleSaveDraft() {
    if (!subject.trim()) return;
    startTransition(async () => {
      await createAnnouncement(eventId, {
        subject: subject.trim(),
        body: body.trim(),
        target_audience: getTargetAudience(),
        channels,
      });
      resetForm();
    });
  }

  function handleSendNow() {
    if (!subject.trim()) return;
    startTransition(async () => {
      const announcement = await createAnnouncement(eventId, {
        subject: subject.trim(),
        body: body.trim(),
        target_audience: getTargetAudience(),
        channels,
      });
      await sendAnnouncement(eventId, announcement.id);
      resetForm();
    });
  }

  return (
    <div className="rounded-xl border p-6 space-y-4">
      <h3 className="text-lg font-semibold">New Announcement</h3>

      <div className="space-y-1.5">
        <label htmlFor="ann-subject" className="text-sm font-medium">
          Subject
        </label>
        <input
          id="ann-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Schedule update for Day 2"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="ann-body" className="text-sm font-medium">
          Body
        </label>
        <textarea
          id="ann-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Write your announcement message..."
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Target Audience</span>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} className="accent-foreground" />
            All Attendees
          </label>
          {ticketTypes.length > 0 && (
            <>
              <label className="flex items-center gap-2">
                <input type="radio" name="audience" value="ticket_types" checked={audience === "ticket_types"} onChange={() => setAudience("ticket_types")} className="accent-foreground" />
                By Ticket Type
              </label>
              {audience === "ticket_types" && (
                <div className="ml-6 space-y-1.5">
                  {ticketTypes.map((tt) => (
                    <label key={tt.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTicketTypes.includes(tt.id)}
                        onChange={(e) =>
                          setSelectedTicketTypes((prev) =>
                            e.target.checked ? [...prev, tt.id] : prev.filter((id) => id !== tt.id)
                          )
                        }
                        className="accent-foreground"
                      />
                      {tt.name}
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Channels</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channels.includes("in_app")}
              onChange={() => toggleChannel("in_app")}
              className="accent-foreground"
            />
            In-App
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channels.includes("email")}
              onChange={() => toggleChannel("email")}
              className="accent-foreground"
            />
            Email
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={channels.includes("push")}
              onChange={() => toggleChannel("push")}
              className="accent-foreground"
            />
            Push Notification
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending || !subject.trim()}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={handleSendNow}
          disabled={isPending || !subject.trim()}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send Now"}
        </button>
      </div>
    </div>
  );
}
