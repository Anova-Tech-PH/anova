"use client";

import { useState, useTransition } from "react";
import { saveCertificateConfig } from "../actions";

type Session = { id: string; title: string };

export function CertificateConfig({
  eventId,
  sessions,
  initial,
}: {
  eventId: string;
  sessions: Session[];
  initial: {
    id: string;
    title: string;
    min_check_ins: number;
    required_session_ids: string[];
    custom_fields: Record<string, string>;
    template_style: string;
    enabled: boolean;
  } | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "Certificate of Attendance");
  const [minCheckIns, setMinCheckIns] = useState(initial?.min_check_ins ?? 1);
  const [requiredSessions, setRequiredSessions] = useState<string[]>(
    initial?.required_session_ids ?? []
  );
  const [creditHours, setCreditHours] = useState(
    (initial?.custom_fields as Record<string, string>)?.credit_hours ?? ""
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveCertificateConfig(eventId, {
        title,
        min_check_ins: minCheckIns,
        required_session_ids: requiredSessions,
        custom_fields: creditHours ? { credit_hours: creditHours } : {},
        template_style: "classic",
        enabled,
      });
    });
  }

  function toggleSession(sid: string) {
    setRequiredSessions((prev) =>
      prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]
    );
  }

  return (
    <div className="rounded-xl border p-6 space-y-5">
      <h3 className="text-lg font-semibold">Certificate Settings</h3>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Certificate Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Minimum Sessions Attended</label>
        <input
          type="number"
          min={1}
          value={minCheckIns}
          onChange={(e) => setMinCheckIns(parseInt(e.target.value) || 1)}
          className="w-24 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {sessions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Required Sessions (optional)</label>
          <p className="text-xs text-muted-foreground">
            Attendees must have checked into these specific sessions.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requiredSessions.includes(s.id)}
                  onChange={() => toggleSession(s.id)}
                  className="accent-foreground"
                />
                {s.title}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Credit Hours (optional)</label>
        <input
          type="text"
          value={creditHours}
          onChange={(e) => setCreditHours(e.target.value)}
          placeholder="e.g. 5 CEU"
          className="w-48 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-foreground"
        />
        Enable certificates (attendees can download from event page)
      </label>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}
