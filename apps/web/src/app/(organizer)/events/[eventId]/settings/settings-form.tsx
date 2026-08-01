"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, X, ImageIcon } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { Input, Textarea, Button, Badge, Card } from "@attendly/ui/components";

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
            <label className="text-sm font-medium">Hero background image</label>
            <CoverImageUpload
              eventId={event.id}
              currentUrl={form.cover_image}
              onUploaded={(url) => setForm((f) => ({ ...f, cover_image: url }))}
              onRemoved={() => setForm((f) => ({ ...f, cover_image: "" }))}
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
              className="bg-primary hover:bg-primary/90"
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

function CoverImageUpload({
  eventId,
  currentUrl,
  onUploaded,
  onRemoved,
}: {
  eventId: string;
  currentUrl: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${eventId}/hero.${ext}`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    onUploaded(data.publicUrl);
    setUploading(false);
    toast.success("Image uploaded");

    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleRemove() {
    onRemoved();
  }

  if (currentUrl) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-lg border">
          <img
            src={currentUrl}
            alt="Hero background"
            className="h-40 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Click the X to remove, or upload a new image to replace.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : "Replace Image"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <ImageIcon className="h-8 w-8" />
        <span className="text-sm font-medium">
          {uploading ? "Uploading..." : "Click to upload hero image"}
        </span>
        <span className="text-xs">PNG, JPG, WebP up to 5MB</span>
      </button>
    </div>
  );
}
