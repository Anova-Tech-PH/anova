"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, FileDown } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { duplicateEvent } from "@/features/events/actions";
import { saveAsTemplate } from "@/features/templates/actions";
import { Input, Button, Badge, Card, useConfirm } from "@attendly/ui/components";
import { EventBasicsForm } from "@/features/events/components/event-basics-form";
import type { EventFormData } from "@/features/events/components/event-basics-form";

export function EventSettingsForm({
  event,
}: {
  event: Record<string, unknown> & { id: string; status: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState(event.status);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleSave(data: EventFormData) {
    const supabase = createClient();

    const slug = (data.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error } = await supabase
      .from("events")
      .update({
        title: data.title,
        slug,
        abbreviation: data.abbreviation || null,
        description: data.description || null,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        timezone: data.timezone,
        max_attendees: data.max_attendees || null,
        venue_name: data.location_data?.venue_name || null,
        venue_address: data.location_data?.formatted_address || null,
        location_data: data.location_data ?? {},
        welcome_message: data.welcome_message || null,
        airport_ride_sharing: data.airport_ride_sharing,
        event_website_url: data.event_website_url || null,
        logo: data.logo || null,
        cover_image: data.cover_image || null,
        twitter_hashtags: data.twitter_hashtags || null,
        post_event_summary: data.post_event_summary,
        generate_interests: data.generate_interests,
        organization_name: data.organization_name || null,
        attendee_origin: data.attendee_origin || null,
        topic_tags: data.topic_tags,
        organization_type: data.organization_type,
        event_type: data.event_type || null,
        event_type_other: data.event_type_other || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Event updated");
    router.refresh();
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
    const ok = await confirm({
      title: "Delete Event",
      description:
        "Are you sure you want to delete this event? This will permanently delete all registrations, sessions, and data. This action cannot be undone.",
      confirmLabel: "Delete Event",
    });
    if (!ok) return;

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

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setSavingTemplate(true);
    try {
      await saveAsTemplate(event.id, templateName.trim());
      toast.success("Template saved");
      setTemplateName("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save template"
      );
    }
    setSavingTemplate(false);
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const result = await duplicateEvent(event.id);
      toast.success("Event duplicated");
      router.push(`/events/${result.id}/settings`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to duplicate event"
      );
      setDuplicating(false);
    }
  }

  return (
    <div className="space-y-8">
      <EventBasicsForm mode="edit" event={event} onSubmit={handleSave} />

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

      {/* Duplicate event */}
      <Card className="p-6">
        <h2 className="mb-2 text-lg font-semibold">Duplicate Event</h2>
        <p className="text-sm text-muted-foreground">
          Create a copy of this event including all tickets, tracks, sessions,
          and speakers. The duplicate will be created as a draft.
        </p>
        <Button
          variant="outline"
          onClick={handleDuplicate}
          loading={duplicating}
          className="mt-4 gap-2"
        >
          <Copy className="h-4 w-4" />
          {duplicating ? "Duplicating..." : "Duplicate Event"}
        </Button>
      </Card>

      {/* Save as Template */}
      <Card className="p-6">
        <h2 className="mb-2 text-lg font-semibold">Save as Template</h2>
        <p className="text-sm text-muted-foreground">
          Save this event&apos;s configuration as a reusable template.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Template name</label>
            <Input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Annual Conference"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleSaveTemplate}
            loading={savingTemplate}
            disabled={!templateName.trim()}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            {savingTemplate ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </Card>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-destructive">
          Danger Zone
        </h2>
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
      {confirmDialog}
    </div>
  );
}
