"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/shared/utils/supabase/client";
import { Input, Textarea, Button, Badge, Card } from "@/shared/components/ui";

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
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">General</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Slug</label>
              <Input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End date</label>
              <Input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cover image URL</label>
            <Input
              type="url"
              value={form.cover_image}
              onChange={(e) => setForm((f) => ({ ...f, cover_image: e.target.value }))}
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
              <Input
                type="url"
                value={form.virtual_url}
                onChange={(e) => setForm((f) => ({ ...f, virtual_url: e.target.value }))}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Venue name</label>
                <Input
                  type="text"
                  value={form.venue_name}
                  onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Venue address</label>
                <Input
                  type="text"
                  value={form.venue_address}
                  onChange={(e) => setForm((f) => ({ ...f, venue_address: e.target.value }))}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            loading={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Publishing */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Publishing</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">
              Status:{" "}
              <Badge
                variant={
                  status === "published"
                    ? "success"
                    : status === "draft"
                      ? "warning"
                      : "default"
                }
              >
                {status}
              </Badge>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "published"
                ? "Your event is visible to the public."
                : "Your event is only visible to organizers."}
            </p>
          </div>
          {status === "draft" ? (
            <Button
              onClick={() => handleStatusChange("published")}
              className="bg-green-600 hover:bg-green-700"
            >
              Publish Event
            </Button>
          ) : status === "published" ? (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("draft")}
            >
              Unpublish
            </Button>
          ) : null}
        </div>
      </Card>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete this event and all associated data.
        </p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          loading={deleting}
          className="mt-4"
        >
          {deleting ? "Deleting..." : "Delete Event"}
        </Button>
      </div>
    </div>
  );
}
