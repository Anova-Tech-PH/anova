"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/shared/utils/supabase/client";

type Event = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  venue_name: string | null;
  venue_address: string | null;
  is_virtual: boolean;
  virtual_url: string | null;
  cover_image: string | null;
  status: string;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function EventSettingsForm({ event }: { event: Event }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: event.title,
    slug: event.slug,
    description: event.description ?? "",
    start_date: toLocalInput(event.start_date),
    end_date: toLocalInput(event.end_date),
    timezone: event.timezone,
    venue_name: event.venue_name ?? "",
    venue_address: event.venue_address ?? "",
    is_virtual: event.is_virtual,
    virtual_url: event.virtual_url ?? "",
    cover_image: event.cover_image ?? "",
  });
  const [status, setStatus] = useState(event.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("events")
      .update({
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        timezone: form.timezone,
        venue_name: form.venue_name || null,
        venue_address: form.venue_address || null,
        is_virtual: form.is_virtual,
        virtual_url: form.virtual_url || null,
        cover_image: form.cover_image || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Event updated");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleStatusChange(newStatus: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", event.id);

    if (error) {
      toast.error(error.message);
    } else {
      setStatus(newStatus);
      toast.success(`Event ${newStatus}`);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    if (!confirm("This will also delete all registrations, sessions, and data. Continue?")) return;

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", event.id);

    if (error) {
      toast.error(error.message);
      setDeleting(false);
    } else {
      toast.success("Event deleted");
      router.push("/events");
    }
  }

  return (
    <div className="space-y-8">
      {/* General settings */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">General</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start date</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End date</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cover image URL</label>
            <input
              type="url"
              value={form.cover_image}
              onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_virtual"
              checked={form.is_virtual}
              onChange={(e) => setForm((f) => ({ ...f, is_virtual: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="is_virtual" className="text-sm">Virtual event</label>
          </div>

          {form.is_virtual ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Virtual URL</label>
              <input
                type="url"
                value={form.virtual_url}
                onChange={(e) => setForm((f) => ({ ...f, virtual_url: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Venue name</label>
                <input
                  type="text"
                  value={form.venue_name}
                  onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Venue address</label>
                <input
                  type="text"
                  value={form.venue_address}
                  onChange={(e) => setForm((f) => ({ ...f, venue_address: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Publishing */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Publishing</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">
              Status:{" "}
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  status === "published"
                    ? "bg-green-100 text-green-700"
                    : status === "draft"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {status}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "published"
                ? "Your event is visible to the public."
                : "Your event is only visible to organizers."}
            </p>
          </div>
          {status === "draft" ? (
            <button
              onClick={() => handleStatusChange("published")}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Publish Event
            </button>
          ) : status === "published" ? (
            <button
              onClick={() => handleStatusChange("draft")}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Unpublish
            </button>
          ) : null}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete this event and all associated data.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Event"}
        </button>
      </div>
    </div>
  );
}
