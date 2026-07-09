"use client";

import { useState } from "react";
import { X } from "lucide-react";

const SESSION_TYPES = [
  { value: "keynote", label: "Keynote" },
  { value: "talk", label: "Talk" },
  { value: "workshop", label: "Workshop" },
  { value: "panel", label: "Panel" },
  { value: "break", label: "Break" },
];

type Track = { id: string; name: string; color: string | null };
type Speaker = { id: string; name: string };

type SessionFormData = {
  id?: string;
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string;
  track_id: string;
  speaker_ids: string[];
};

export function SessionForm({
  session,
  tracks,
  speakers,
  onSubmit,
  onCancel,
}: {
  session?: SessionFormData;
  tracks: Track[];
  speakers: Speaker[];
  onSubmit: (data: Omit<SessionFormData, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<SessionFormData, "id">>({
    title: session?.title ?? "",
    description: session?.description ?? "",
    type: session?.type ?? "talk",
    start_time: session?.start_time ?? "",
    end_time: session?.end_time ?? "",
    location: session?.location ?? "",
    track_id: session?.track_id ?? "",
    speaker_ids: session?.speaker_ids ?? [],
  });
  const [loading, setLoading] = useState(false);

  function toggleSpeaker(speakerId: string) {
    setForm((f) => ({
      ...f,
      speaker_ids: f.speaker_ids.includes(speakerId)
        ? f.speaker_ids.filter((id) => id !== speakerId)
        : [...f.speaker_ids, speakerId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {session ? "Edit Session" : "Add Session"}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {SESSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {tracks.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Track</label>
                <select
                  value={form.track_id}
                  onChange={(e) => setForm((f) => ({ ...f, track_id: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No track</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start time *</label>
              <input
                type="datetime-local"
                required
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End time *</label>
              <input
                type="datetime-local"
                required
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Main Hall, Room A"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {speakers.length > 0 && form.type !== "break" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Speakers</label>
              <div className="flex flex-wrap gap-2">
                {speakers.map((speaker) => (
                  <button
                    key={speaker.id}
                    type="button"
                    onClick={() => toggleSpeaker(speaker.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.speaker_ids.includes(speaker.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    {speaker.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.title || !form.start_time || !form.end_time}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Saving..." : session ? "Update" : "Add Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
